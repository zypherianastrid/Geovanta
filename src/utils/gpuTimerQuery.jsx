/**
 * @file src/utils/gpuTimerQuery.jsx
 * @description Probe & helper EXT_disjoint_timer_query_webgl2 untuk P2-05.
 *
 * Temuan P2-05: `renderPassMs` hanya mengukur waktu CPU menyiapkan+mengirim
 * draw command, BUKAN waktu eksekusi GPU. Extension timer query memberi
 * waktu GPU yang sebenarnya — bila tersedia. Modul ini HANYA menyediakan
 * probe + helper; pemasangan query di sekeliling draw call harus dilakukan
 * di `src/renderer/sceneRenderer.jsx`, yang TERLARANG untuk Track 4
 * (track lain bekerja di file itu). Karena itu wiring sceneRenderer
 * dilaporkan sebagai blocked-butuh-koordinasi (lihat RANCANGAN WIRING di
 * bawah + laporan Track 4). Telemetri sudah siap menerima hasilnya lewat
 * `PERF_TELEMETRY.recordGpuTimeMs(ms)` / `setGpuTimerQuerySupported(bool)`.
 *
 * RANCANGAN WIRING (untuk koordinator, di sceneRenderer.jsx):
 *   1. Di konstruktor / saat context dibuat, panggil
 *      `initGpuTimerQuery(gl)` sekali; simpan hasilnya di `this._gpuTimer`.
 *      Bila null, panggil `PERF_TELEMETRY.setGpuTimerQuerySupported(false)`
 *      dan lewati langkah 2–3 (gpuTimeMs tetap null = "tak tersedia").
 *   2. Di `renderFrame()`, sebelum draw call utama: `beginGpuTimerQuery(gl)`
 *      — membuat query baru (atau reuse dari pool kecil, maks 4 query
 *      tertunda) dan `ext.beginQuery(ext.TIME_ELAPSED_EXT, query)`.
 *   3. Setelah draw call utama (sebelum `gl.flush()`/akhir frame):
 *      `ext.endQuery(ext.TIME_ELAPSED_EXT)`, lalu di frame BERIKUTNYA
 *      panggil `pollGpuTimerQueries(gl)`; query yang
 *      `QUERY_RESULT_AVAILABLE` dibaca via `getQueryParameter(...,
 *      QUERY_RESULT)` (nanodetik → ms), hasilnya dikirim ke
 *      `PERF_TELEMETRY.recordGpuTimeMs(ms)`. WAJIB cek
 *      `GPU_DISJOINT_EXT` — bila disjoint, buang sampel itu.
 *   4. Jangan membuat query baru bila pool penuh; jangan block menunggu
 *      hasil (polling async antar-frame saja). Jangan ubah
 *      `preserveDrawingBuffer`.
 */

/* Probe extension pada context WebGL2 sementara (pola sama seperti
   probeGpuCapabilities: context 1x1, langsung dilepas via lose_context). */
const probeGpuTimerQuerySupport = () => {
  try {
    if (typeof document === 'undefined' || !document.createElement) return false;
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const gl = cv.getContext('webgl2');
    if (!gl) {
      cv.width = 0;
      cv.height = 0;
      return false;
    }
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    let ok = false;
    try {
      ok = !!ext && typeof ext.createQuery === 'function';
    } catch (e) {
      ok = false;
    }
    try {
      const loseExt = gl.getExtension('WEBGL_lose_context');
      if (loseExt && typeof loseExt.loseContext === 'function') loseExt.loseContext();
    } catch (e) {}
    cv.width = 0;
    cv.height = 0;
    return ok;
  } catch (e) {
    return false;
  }
};
const GPU_TIMER_QUERY_SUPPORTED = probeGpuTimerQuerySupport();

/* Inisialisasi pada context render aktif. Kembalikan null bila tak didukung. */
const initGpuTimerQuery = gl => {
  try {
    if (!gl) return null;
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!ext || typeof ext.createQuery !== 'function') return null;
    return {
      ext,
      pending: []
    };
  } catch (e) {
    return null;
  }
};

/* Mulai pengukuran satu frame; kembalikan query atau null (pool penuh). */
const beginGpuTimerQuery = (timerState, gl) => {
  try {
    if (!timerState || !timerState.ext || !gl) return null;
    if (timerState.pending.length >= 4) return null;
    const q = timerState.ext.createQuery();
    if (!q) return null;
    timerState.ext.beginQuery(timerState.ext.TIME_ELAPSED_EXT, q);
    timerState.pending.push(q);
    return q;
  } catch (e) {
    return null;
  }
};

/* Akhiri pengukuran frame berjalan. */
const endGpuTimerQuery = timerState => {
  try {
    if (!timerState || !timerState.ext) return;
    timerState.ext.endQuery(timerState.ext.TIME_ELAPSED_EXT);
  } catch (e) {}
};

/* Poll query yang sudah selesai (dipanggil di frame berikutnya, non-blocking).
   Mengembalikan array durasi GPU dalam ms (kosong bila belum ada yang siap).
   Sampel yang disjoint dibuang. Query yang sudah dibaca dihapus. */
const pollGpuTimerQueries = (timerState, gl) => {
  const out = [];
  try {
    if (!timerState || !timerState.ext || !gl) return out;
    const ext = timerState.ext;
    const remaining = [];
    for (const q of timerState.pending) {
      let available = false;
      try {
        available = !!gl.getQueryParameter(q, ext.QUERY_RESULT_AVAILABLE);
      } catch (e) {
        available = false;
      }
      if (!available) {
        remaining.push(q);
        continue;
      }
      try {
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        if (!disjoint) {
          const ns = gl.getQueryParameter(q, ext.QUERY_RESULT);
          if (typeof ns === 'number' && Number.isFinite(ns)) out.push(ns / 1e6);
        }
      } catch (e) {}
      try {
        ext.deleteQuery(q);
      } catch (e) {}
    }
    timerState.pending = remaining;
  } catch (e) {}
  return out;
};

export { probeGpuTimerQuerySupport, GPU_TIMER_QUERY_SUPPORTED, initGpuTimerQuery, beginGpuTimerQuery, endGpuTimerQuery, pollGpuTimerQueries };
export default GPU_TIMER_QUERY_SUPPORTED;
