/**
 * @file src/workspace/thumbnailScheduler.jsx
 * @description Penjadwal thumbnail P2-04 (Track 4): idle + cache revisi + durasi.
 *
 * Perilaku lama (workspaceController): thumbnail dijadwalkan lewat
 * `Promise.resolve().then(...)` — praktis langsung setelah transaksi simpan,
 * tanpa menunggu idle dan tanpa cache; setiap commit (throttle 4,5 dtk)
 * menggambar ulang thumbnail penuh di main thread.
 *
 * Perilaku baru:
 *  1. IDLE — digambar hanya saat browser idle (`requestIdleCallback`,
 *     timeout 3000 ms; fallback `setTimeout 1200 ms` bila RIC tak ada),
 *     dan hanya setelah autosave stabil: tidak ada save aktif, tidak ada
 *     job antre, status bukan 'saving'/'dirty'. Bila belum stabil, dijadwal
 *     ulang maks 3x (jeda 1500 ms); sesudah itu job dibuang dan dihitung
 *     sebagai `droppedUnstable` (dokumen utama SUDAH tersimpan — thumbnail
 *     yang hilang hanya membuat kartu Workspace memakai thumbnail lama).
 *  2. CACHE REVISI — kunci cache `${projectId}|${seq}`; seq adalah nomor
 *     commit autosave (= revisi dokumen saat disimpan). Bila kunci yang
 *     sama sudah pernah dibuat, pembuatan dilewati dan dihitung sebagai
 *     `skippedCached`. Cache dibatasi 16 entri terakhir (evict tertua).
 *     Koalescing: bila ada job thumbnail tertunda untuk proyek yang sama,
 *     hanya dokumen terbaru yang digambar.
 *  3. DURASI — setiap pembuatan diukur (`performance.now`) dan dilaporkan
 *     ke telemetri sebagai thumbnailLastMs + p95 ring 60 sampel +
 *     thumbnailCount, terpisah dari autosave (P2-05).
 *
 * Temuan Worker (bukan kegagalan): `generateThumbnailBlob` TIDAK bisa
 * dipindah ke Worker apa adanya — ia memakai `document.createElement(
 * 'canvas')`, `new Image()`, `Path2D`, `VE.docBounds/serializePath`, dan
 * font canvas 2D, semuanya terikat DOM di main thread. Pindah ke Worker
 * butuh OffscreenCanvas + pemisahan kode gambar dari DOM/VE (refactor
 * besar, di luar scope Track 4). Yang dilakukan di sini adalah mitigasi
 * yang diminta audit: idle + cache + catat durasi.
 *
 * Modul ini tidak mengimpor ThumbnailGenerator/WorkspaceDB langsung —
 * `generate` dan `persist` di-inject oleh WorkspaceController — agar
 * scheduler bisa diuji di Node tanpa DOM (lihat laporan Track 4).
 */
const createThumbnailScheduler = (deps = {}) => {
  const generate = typeof deps.generate === 'function' ? deps.generate : async () => null;
  const persist = typeof deps.persist === 'function' ? deps.persist : async () => {};
  const isStable = typeof deps.isStable === 'function' ? deps.isStable : () => true;
  const report = typeof deps.report === 'function' ? deps.report : () => {};
  const nowFn = typeof deps.now === 'function' ? deps.now : () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const idleFn = typeof deps.requestIdle === 'function' ? deps.requestIdle : (typeof requestIdleCallback === 'function' ? cb => requestIdleCallback(cb, {
    timeout: 3000
  }) : cb => setTimeout(cb, 1200));
  const delayFn = typeof deps.setTimeout === 'function' ? deps.setTimeout : (cb, ms) => setTimeout(cb, ms);
  const MAX_CACHE_ENTRIES = 16;
  const MAX_UNSTABLE_RETRIES = 3;
  const UNSTABLE_RETRY_MS = 1500;
  const cache = new Map();
  const pendingByProject = new Map();
  const stats = {
    scheduled: 0,
    generated: 0,
    skippedCached: 0,
    droppedUnstable: 0,
    lastMs: 0,
    p95Ms: 0,
    count: 0
  };
  const _durations = [];
  const _pushDuration = ms => {
    _durations.push(ms);
    if (_durations.length > 60) _durations.shift();
    const sorted = [..._durations].sort((a, b) => a - b);
    stats.p95Ms = Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * 0.95)))] * 100) / 100;
  };
  const _report = (sampled = false) => {
    try {
      report({
        thumbnailSample: sampled,
        thumbnailLastMs: stats.lastMs,
        thumbnailP95Ms: stats.p95Ms,
        thumbnailCount: stats.count,
        thumbnailSkippedCached: stats.skippedCached,
        thumbnailDroppedUnstable: stats.droppedUnstable
      });
    } catch (e) {}
  };
  const _run = async job => {
    if (!isStable()) {
      if (job.retries < MAX_UNSTABLE_RETRIES) {
        job.retries++;
        job.timerId = delayFn(() => _run(job), UNSTABLE_RETRY_MS);
        return;
      }
      stats.droppedUnstable++;
      pendingByProject.delete(job.projectId);
      _report();
      return;
    }
    pendingByProject.delete(job.projectId);
    const t0 = nowFn();
    try {
      const blob = await generate(job.doc);
      const dt = nowFn() - t0;
      if (!blob || blob.size < 16) return;
      await persist(job.projectId, blob);
      stats.generated++;
      stats.count++;
      stats.lastMs = Math.round(dt * 100) / 100;
      _pushDuration(stats.lastMs);
      cache.set(job.projectId + '|' + job.seq, Date.now());
      if (cache.size > MAX_CACHE_ENTRIES) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      _report(true);
    } catch (e) {}
  };
  const schedule = (projectId, doc, seq) => {
    if (!projectId || !doc) return 'dropped';
    const key = projectId + '|' + seq;
    if (cache.has(key)) {
      stats.skippedCached++;
      _report();
      return 'skipped-cached';
    }
    stats.scheduled++;
    const existing = pendingByProject.get(projectId);
    if (existing) {
      existing.doc = doc;
      existing.seq = seq;
      return 'scheduled';
    }
    const job = {
      projectId,
      doc,
      seq,
      retries: 0,
      timerId: 0
    };
    pendingByProject.set(projectId, job);
    job.timerId = idleFn(() => _run(job));
    return 'scheduled';
  };
  const getStats = () => ({
    ...stats,
    pending: pendingByProject.size,
    cacheSize: cache.size
  });
  const getCacheKeys = () => Array.from(cache.keys());
  return {
    schedule,
    getStats,
    getCacheKeys
  };
};

export { createThumbnailScheduler };
export default createThumbnailScheduler;
