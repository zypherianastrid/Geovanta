/**
 * @file src/components/workspace/WorkspaceHome.jsx
 * @description Komponen halaman utama manajemen proyek Workspace Geovanta (WorkspaceHome)
 */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ProjectRepository } from '../../workspace/projectRepository.jsx';
import { WorkspaceController } from '../../workspace/workspaceController.jsx';
import { ICONS, LOGO_INNER } from '../../constants/brandAndIcons.jsx';
import { Ico } from '../ui/IconGlyphs.jsx';
import { formatBytes, formatDateTimeFull, formatDateRel } from '../../utils/zoomAndFormatHelpers.jsx';
import { WorkspaceDB } from '../../workspace/workspaceDb.jsx';
import { CustomTextBox } from '../ui/CustomTextBox.jsx';
import { Select } from '../ui/SelectDropdown.jsx';
import { WorkspaceProjectThumb } from './WorkspaceProjectThumb.jsx';
import { XfField } from '../ui/TransformField.jsx';

const WorkspaceHome = ({
  onOpenProject,
  onSettings,
  onHelp,
  flash,
  recoveryCandidates = [],
  onResolveRecovery
}) => {
  const [navTab, setNavTab] = useState('all'); // 'recent' | 'all' | 'favorites' | 'trash'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('Untitled Project');
  const [newProjPreset, setNewProjPreset] = useState('800x600');
  const [newProjW, setNewProjW] = useState(800);
  const [newProjH, setNewProjH] = useState(600);
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // project object for permanent delete confirmation
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const refreshWorkspace = async () => {
    try {
      const [list, stats] = await Promise.all([ProjectRepository.listProjects({
        filter: navTab,
        search: searchQuery,
        sortBy
      }), ProjectRepository.getStorageStats()]);
      setProjects(list);
      setStorageStats(stats);
    } catch (err) {
      flash && flash('Gagal memuat daftar proyek: ' + (err && err.message || 'kesalahan database'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshWorkspace();
  }, [navTab, searchQuery, sortBy]);
  useEffect(() => {
    const closeMenu = e => {
      if (openMenuId && (!e.target.closest || !e.target.closest('.ws-card-menu-wrap'))) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [openMenuId]);
  const handleQuickCreate = async (customName, w = 800, h = 600) => {
    try {
      const name = String(customName || 'Untitled Project').trim() || 'Untitled Project';
      const vw = Math.max(32, Math.min(16384, Number(w) || 800));
      const vh = Math.max(32, Math.min(16384, Number(h) || 600));
      const {
        project
      } = await ProjectRepository.createProject({
        name,
        initialDoc: {
          viewBox: [0, 0, vw, vh],
          objects: []
        }
      });
      setCreateModalOpen(false);
      onOpenProject(project.id);
    } catch (err) {
      flash && flash('Gagal membuat proyek: ' + (err && err.message || 'kesalahan'));
    }
  };
  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const trimmed = String(renameDraft || '').trim();
    if (!trimmed) {
      flash && flash('Nama proyek tidak boleh kosong');
      return;
    }
    try {
      await ProjectRepository.renameProject(renameTarget.id, trimmed);
      setRenameTarget(null);
      flash && flash(`Nama proyek diubah menjadi "${trimmed}"`);
      refreshWorkspace();
    } catch (err) {
      flash && flash('Gagal mengubah nama proyek: ' + (err && err.message || ''));
    }
  };
  const handleDuplicate = async proj => {
    try {
      const copy = await ProjectRepository.duplicateProject(proj.id);
      flash && flash(`"${copy.name}" berhasil dibuat`);
      refreshWorkspace();
    } catch (err) {
      flash && flash('Gagal menggandakan proyek: ' + (err && err.message || ''));
    }
  };
  const handleMoveToTrash = async proj => {
    try {
      await ProjectRepository.moveToTrash(proj.id);
      flash && flash(`"${proj.name}" dipindahkan ke Sampah`);
      refreshWorkspace();
    } catch (err) {
      flash && flash('Gagal memindahkan ke Sampah');
    }
  };
  const handleRestoreFromTrash = async proj => {
    try {
      await ProjectRepository.restoreFromTrash(proj.id);
      flash && flash(`"${proj.name}" dipulihkan dari Sampah`);
      refreshWorkspace();
    } catch (err) {
      flash && flash('Gagal memulihkan proyek');
    }
  };
  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    try {
      await ProjectRepository.deletePermanently(deleteTarget.id);
      setDeleteTarget(null);
      flash && flash(`Proyek "${name}" dihapus secara permanen`);
      refreshWorkspace();
    } catch (err) {
      flash && flash('Gagal menghapus proyek secara permanen');
    }
  };
  const handleToggleFavorite = async (proj, e) => {
    if (e) e.stopPropagation();
    try {
      await ProjectRepository.toggleFavorite(proj.id);
      refreshWorkspace();
    } catch (err) {}
  };
  const handleExportBackup = async proj => {
    try {
      flash && flash(`Menyiapkan arsip backup "${proj.name}.geovanta"...`);
      const fname = await WorkspaceController.triggerBackupDownload(proj.id);
      if (fname) flash && flash(`Backup "${fname}" berhasil diunduh`);
    } catch (err) {
      flash && flash('Gagal mengekspor backup: ' + (err && err.message || ''));
    }
  };
  const handleImportProjectFiles = async fileList => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    let importedCount = 0;
    let lastImported = null;
    const errors = [];
    for (const f of files) {
      try {
        lastImported = await WorkspaceController.importFileAsNewProject(f);
        importedCount++;
      } catch (err) {
        errors.push(`${f.name}: ${err && err.message ? err.message : 'Gagal'}`);
      }
    }
    setImportModalOpen(false);
    await refreshWorkspace();
    if (importedCount === 1 && lastImported && !errors.length) {
      flash && flash(`Proyek "${lastImported.name}" berhasil diimpor`);
    } else if (importedCount > 0) {
      flash && flash(`${importedCount} proyek diimpor` + (errors.length ? ` · ${errors.length} gagal` : ''));
    } else if (errors.length) {
      flash && flash('Gagal mengimpor: ' + errors[0]);
    }
  };
  const triggerNativeFileImport = async () => {
    if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: true
        });
        const files = await Promise.all(handles.map(h => h.getFile()));
        if (files.length) {
          await handleImportProjectFiles(files);
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    setImportModalOpen(true);
  };
  const ARTBOARD_PRESETS = [['800x600', 'Standar Kanvas (800 × 600)', 800, 600], ['1920x1080', 'Full HD 16:9 (1920 × 1080)', 1920, 1080], ['1080x1080', 'Square / Ikon (1080 × 1080)', 1080, 1080], ['1440x900', 'Web Desktop (1440 × 900)', 1440, 900], ['512x512', 'Logo / Simbol (512 × 512)', 512, 512]];
  const NAV_ITEMS = [{
    id: 'recent',
    label: 'Recent',
    sub: 'Terakhir dibuka',
    icon: 'M12 6v6l4 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'
  }, {
    id: 'all',
    label: 'All Projects',
    sub: 'Semua proyek',
    icon: 'M3 5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'
  }, {
    id: 'favorites',
    label: 'Favorites',
    sub: 'Proyek berbintang',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  }, {
    id: 'trash',
    label: 'Trash',
    sub: 'Sampah sementara',
    icon: ICONS.trash
  }];
  const SORT_OPTIONS = [['updatedAt', 'Terakhir diedit'], ['lastOpenedAt', 'Terakhir dibuka'], ['nameAsc', 'Nama A–Z'], ['nameDesc', 'Nama Z–A'], ['createdAt', 'Terbaru dibuat']];
  return <div className="ws-home-root"><header className="ws-home-header"><div className="ws-home-brand"><svg role="img" aria-label="Geovanta" viewBox="150 180 1750 380" style={{
          height: 28,
          width: 'auto',
          display: 'block',
          color: 'var(--acc)'
        }} dangerouslySetInnerHTML={{
          __html: LOGO_INNER
        }} /><span className="ws-home-badge">Workspace</span></div><div className="ws-home-header-actions"><button type="button" className="btn pri ws-hdr-btn" onClick={() => {
          setNewProjName('Untitled Project');
          setCreateModalOpen(true);
        }}><Ico n="plus" size={15} /><span>Create New</span></button><button type="button" className="btn sec ws-hdr-btn" onClick={() => setImportModalOpen(true)}><Ico n="upload" size={15} /><span>Import Project</span></button><button type="button" className="btn sec ws-hdr-btn" onClick={() => setStorageModalOpen(true)} title="Informasi Penyimpanan Lokal (IndexedDB)"><Ico n="database" size={15} /><span>Storage Info</span>{storageStats && <span className="ws-storage-pill">{formatBytes(storageStats.localProjectBytes)}</span>}</button><button type="button" className="btn sec ws-hdr-icon-btn" onClick={onHelp} title="Pintasan Keyboard (?)"><Ico n="keyboard" size={16} /></button><button type="button" className="btn sec ws-hdr-icon-btn" onClick={onSettings} title="Pengaturan Aplikasi (,)"><Ico n="settings" size={16} /></button></div></header>{WorkspaceDB.isMemoryFallback() && <div className="ws-session-ram-banner" role="status"><div><b>Mode Penyimpanan Sementara (Session-only RAM):</b> Penyimpanan lokal browser (IndexedDB) diblokir atau tidak tersedia. Proyek hanya tersimpan di memori sesi ini dan akan hilang saat tab ditutup — gunakan tombol <b>Export Backup (.geovanta)</b> untuk menyimpan ke perangkat.</div><span className="ws-save-pill st-session-ram">Session-only (RAM)</span></div>}{recoveryCandidates.length > 0 && <div className="ws-recovery-banner"><div className="flex items-center gap-2.5 flex-wrap"><span className="ws-rec-dot" /><span className="text-xs font-semibold">Pemulihan Otomatis Tersedia:</span><span className="text-xs mut">Ditemukan {recoveryCandidates.length} checkpoint proyek yang lebih baru setelah penutupan tak terduga.</span></div><div className="flex items-center gap-2 flex-wrap">{recoveryCandidates.map(rc => <button key={rc.project.id} type="button" className="btn pri text-xs py-1 px-3" onClick={() => onResolveRecovery && onResolveRecovery(rc)}>Tinjau "{rc.project.name}" ({formatDateTimeFull(rc.snapshot.savedAt)})</button>)}</div></div>}<div className="ws-home-body"><aside className="ws-home-nav" aria-label="Navigasi Workspace"><div className="ws-nav-list">{NAV_ITEMS.map(item => {
            const active = navTab === item.id;
            const count = item.id === 'trash' ? storageStats ? storageStats.trashCount : 0 : item.id === 'all' ? storageStats ? storageStats.projectCount : 0 : null;
            return <button key={item.id} type="button" className={'ws-nav-item' + (active ? ' on' : '')} onClick={() => setNavTab(item.id)}><span className="ws-nav-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg></span><span className="ws-nav-txt"><span className="ws-nav-lbl">{item.label}</span><span className="ws-nav-sub">{item.sub}</span></span>{count !== null && <span className="ws-nav-cnt">{count}</span>}</button>;
          })}</div>{storageStats && <div className="ws-nav-storage-card" onClick={() => setStorageModalOpen(true)}><div className="flex items-center justify-between gap-2 mb-1.5"><span className="text-[11px] font-semibold flex items-center gap-1.5"><Ico n="database" size={13} /><span>Penyimpanan Lokal</span></span><span className="text-[10.5px] font-mono" style={{
              color: 'var(--acc)'
            }}>{storageStats.persisted ? 'Persistent' : 'IndexedDB'}</span></div><div className="text-[11px] mut">{storageStats.projectCount} proyek aktif · {storageStats.assetCount} aset Blob</div><div className="text-[11px] font-mono mt-1">{formatBytes(storageStats.localProjectBytes)} digunakan</div></div>}</aside><main className="ws-home-main"><div className="ws-home-toolbar"><div className="ws-toolbar-title-wrap"><h1 className="ws-toolbar-title">{(NAV_ITEMS.find(n => n.id === navTab) || NAV_ITEMS[1]).label}</h1><span className="ws-toolbar-count">{projects.length} proyek</span></div><div className="ws-toolbar-controls"><div className="fld ws-search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mut shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg><div className="flex-1 min-w-[140px]"><CustomTextBox value={searchQuery} ariaLabel="Cari nama proyek" onChange={v => setSearchQuery(v)} onCommit={v => setSearchQuery(v)} /></div>{searchQuery && <button type="button" className="fig-ibtn" style={{
                width: 20,
                height: 20
              }} title="Bersihkan pencarian" onClick={() => setSearchQuery('')}><Ico n="x" size={12} /></button>}</div><div className="ws-sort-wrap"><span className="text-[11px] mut whitespace-nowrap">Urutkan:</span><div style={{
                minWidth: 168
              }}><Select value={sortBy} options={SORT_OPTIONS} on={setSortBy} /></div></div></div></div>{loading ? <div className="ws-empty-state"><div className="text-sm font-medium mut">Memuat Workspace lokal...</div></div> : projects.length === 0 ? <div className="ws-empty-state"><div className="ws-empty-illus"><svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{
              color: 'var(--acc)'
            }}><rect x="3" y="3" width="18" height="18" rx="3" strokeOpacity="0.35" /><path d="M7 15c2-6 8-6 10 0" /><circle cx="7" cy="15" r="1.6" fill="currentColor" /><circle cx="17" cy="15" r="1.6" fill="currentColor" /><circle cx="12" cy="9" r="1.6" fill="currentColor" /><path d="M7 9h10" strokeDasharray="2 2" /></svg></div><div className="ws-empty-title">{searchQuery ? `Tidak ada proyek yang cocok dengan "${searchQuery}"` : navTab === 'trash' ? 'Sampah Kosong' : navTab === 'favorites' ? 'Belum Ada Proyek Favorit' : 'Workspace Anda Masih Kosong'}</div><div className="ws-empty-desc">{navTab === 'trash' ? 'Proyek yang dipindahkan ke Sampah akan muncul di sini sebelum dihapus permanen.' : 'Semua proyek vektor, kurva Bézier, dan aset gambar disimpan 100% lokal di perangkat Anda melalui IndexedDB tanpa server.'}</div>{navTab !== 'trash' && <div className="flex items-center justify-center gap-3 flex-wrap mt-2"><button type="button" className="btn pri ws-hdr-btn" onClick={() => handleQuickCreate('Untitled Project', 800, 600)}><Ico n="plus" size={15} /><span>Create New Project</span></button><button type="button" className="btn sec ws-hdr-btn" onClick={() => setImportModalOpen(true)}><Ico n="upload" size={15} /><span>Import Existing File</span></button></div>}</div> : <div className="ws-project-grid">{projects.map(proj => {
            const isTrash = proj.status === 'trash';
            const menuOpen = openMenuId === proj.id;
            return <div key={proj.id} className="ws-project-card" onDoubleClick={() => !isTrash && onOpenProject(proj.id)}><div className="ws-card-thumb" onClick={() => !isTrash && onOpenProject(proj.id)}><WorkspaceProjectThumb project={proj} /><div className="ws-card-thumb-overlay">{!isTrash ? <button type="button" className="btn pri text-xs py-1.5 px-3.5 shadow-lg" onClick={e => {
                    e.stopPropagation();
                    onOpenProject(proj.id);
                  }}>Buka Editor</button> : <button type="button" className="btn sec text-xs py-1.5 px-3.5" onClick={e => {
                    e.stopPropagation();
                    handleRestoreFromTrash(proj);
                  }}>Pulihkan Proyek</button>}</div>{!isTrash && <button type="button" className={'ws-card-fav-btn' + (proj.favorite ? ' on' : '')} title={proj.favorite ? 'Hapus dari Favorit' : 'Tambahkan ke Favorit'} onClick={e => handleToggleFavorite(proj, e)}><svg width="14" height="14" viewBox="0 0 24 24" fill={proj.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg></button>}</div><div className="ws-card-body"><div className="ws-card-title-row"><div className="ws-card-title" title={proj.name} onClick={() => !isTrash && onOpenProject(proj.id)}>{proj.name}</div><div className="ws-card-menu-wrap"><button type="button" className="fig-ibtn ws-card-menu-btn" aria-label="Menu Tindakan Proyek" onClick={e => {
                      e.stopPropagation();
                      setOpenMenuId(menuOpen ? null : proj.id);
                    }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg></button>{menuOpen && <div className="ws-card-dropdown" onClick={e => e.stopPropagation()}>{!isTrash && <><button type="button" className="ws-menu-item" onClick={() => {
                          setOpenMenuId(null);
                          onOpenProject(proj.id);
                        }}><Ico n="play" size={13} /><span>Open</span></button><button type="button" className="ws-menu-item" onClick={() => {
                          setOpenMenuId(null);
                          setRenameTarget(proj);
                          setRenameDraft(proj.name);
                        }}><Ico n="pencil" size={13} /><span>Rename</span></button><button type="button" className="ws-menu-item" onClick={() => {
                          setOpenMenuId(null);
                          handleDuplicate(proj);
                        }}><Ico n="copy" size={13} /><span>Duplicate</span></button><button type="button" className="ws-menu-item" onClick={() => {
                          setOpenMenuId(null);
                          handleExportBackup(proj);
                        }}><Ico n="download" size={13} /><span>Export Backup (.geovanta)</span></button><div className="ws-menu-sep" /><button type="button" className="ws-menu-item warn" onClick={() => {
                          setOpenMenuId(null);
                          handleMoveToTrash(proj);
                        }}><Ico n="trash" size={13} /><span>Move to Trash</span></button></>}{isTrash && <button type="button" className="ws-menu-item" onClick={() => {
                        setOpenMenuId(null);
                        handleRestoreFromTrash(proj);
                      }}><Ico n="refresh" size={13} /><span>Restore Project</span></button>}<button type="button" className="ws-menu-item danger" onClick={() => {
                        setOpenMenuId(null);
                        setDeleteTarget(proj);
                      }}><Ico n="x" size={13} /><span>Delete Permanently</span></button></div>}</div></div><div className="ws-card-meta"><span>Diedit {formatDateRel(proj.updatedAt)}</span><span>·</span><span className="font-mono">{formatBytes(proj.storageSize || 0)}</span><span>·</span><span className="font-mono">v{proj.revision || 1}</span></div></div></div>;
          })}</div>}</main></div>{createModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setCreateModalOpen(false);
    }}><div className="hp" role="dialog" aria-label="Buat Proyek Baru" style={{
        maxWidth: 440
      }}><div className="flex items-center justify-between mb-3"><div><div className="text-sm font-semibold">Buat Proyek Vektor Baru</div><div className="text-[11px] mut mt-0.5">Tentukan nama proyek dan ukuran kanvas awal (viewBox).</div></div><button type="button" className="btn sec" style={{
            padding: 0,
            width: 30,
            height: 30,
            borderRadius: '50%'
          }} onClick={() => setCreateModalOpen(false)}><Ico n="x" size={14} /></button></div><div className="space-y-3"><div><div className="text-[11px] mut font-medium mb-1">Nama Proyek</div><div className="fld px-2.5 py-1.5"><CustomTextBox value={newProjName} autoFocus={true} ariaLabel="Nama Proyek Baru" onChange={setNewProjName} onCommit={v => setNewProjName(v)} /></div></div><div><div className="text-[11px] mut font-medium mb-1">Preset Artboard</div><Select value={newProjPreset} options={ARTBOARD_PRESETS.map(([k, lb]) => [k, lb])} on={k => {
              setNewProjPreset(k);
              const found = ARTBOARD_PRESETS.find(p => p[0] === k);
              if (found) {
                setNewProjW(found[2]);
                setNewProjH(found[3]);
              }
            }} /></div><div className="grid grid-cols-2 gap-2"><div><div className="text-[11px] mut font-medium mb-1">Lebar (px)</div><XfField label="W" value={newProjW} min={32} step={10} on={setNewProjW} /></div><div><div className="text-[11px] mut font-medium mb-1">Tinggi (px)</div><XfField label="H" value={newProjH} min={32} step={10} on={setNewProjH} /></div></div><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn sec text-xs px-3.5 py-2" onClick={() => setCreateModalOpen(false)}>Batal</button><button type="button" className="btn pri text-xs px-4 py-2" onClick={() => handleQuickCreate(newProjName, newProjW, newProjH)}><Ico n="plus" size={14} /><span>Buat & Buka Proyek</span></button></div></div></div></div>, document.body)}{renameTarget && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setRenameTarget(null);
    }}><div className="hp" role="dialog" aria-label="Ganti Nama Proyek" style={{
        maxWidth: 400
      }}><div className="flex items-center justify-between mb-3"><div className="text-sm font-semibold">Ganti Nama Proyek</div><button type="button" className="btn sec" style={{
            padding: 0,
            width: 28,
            height: 28,
            borderRadius: '50%'
          }} onClick={() => setRenameTarget(null)}><Ico n="x" size={13} /></button></div><div className="space-y-3"><div className="fld px-2.5 py-1.5"><CustomTextBox value={renameDraft} autoFocus={true} ariaLabel="Nama Proyek" onChange={setRenameDraft} onCommit={v => setRenameDraft(v)} /></div><div className="flex justify-end gap-2"><button type="button" className="btn sec text-xs px-3 py-1.5" onClick={() => setRenameTarget(null)}>Batal</button><button type="button" className="btn pri text-xs px-4 py-1.5" onClick={handleRenameSubmit}>Simpan Nama</button></div></div></div></div>, document.body)}{deleteTarget && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setDeleteTarget(null);
    }}><div className="hp" role="dialog" aria-label="Konfirmasi Hapus Permanen" style={{
        maxWidth: 420
      }}><div className="flex items-center justify-between mb-2"><div className="text-sm font-semibold text-red-400">Hapus Proyek Secara Permanen?</div><button type="button" className="btn sec" style={{
            padding: 0,
            width: 28,
            height: 28,
            borderRadius: '50%'
          }} onClick={() => setDeleteTarget(null)}><Ico n="x" size={13} /></button></div><div className="text-xs mut leading-relaxed mb-4">Proyek <b>"{deleteTarget.name}"</b> beserta seluruh dokumen vektor, riwayat checkpoint, thumbnail, dan aset gambar Blob miliknya akan dihapus permanen dari IndexedDB dan tidak dapat dikembalikan.</div><div className="flex justify-end gap-2"><button type="button" className="btn sec text-xs px-3.5 py-2" onClick={() => setDeleteTarget(null)}>Batal</button><button type="button" className="btn pri text-xs px-4 py-2" style={{
            background: '#ef4444',
            borderColor: '#ef4444'
          }} onClick={handlePermanentDelete}><Ico n="trash" size={13} /><span>Hapus Permanen</span></button></div></div></div>, document.body)}{importModalOpen && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setImportModalOpen(false);
    }}><div className="hp" role="dialog" aria-label="Impor Proyek ke Workspace" style={{
        maxWidth: 480
      }}><div className="flex items-center justify-between mb-3"><div><div className="text-sm font-semibold">Impor Proyek atau Arsip Backup (.geovanta)</div><div className="text-[11px] mut mt-0.5">Membuat proyek baru di Workspace dari berkas cadangan atau desain.</div></div><button type="button" className="btn sec" style={{
            padding: 0,
            width: 30,
            height: 30,
            borderRadius: '50%'
          }} onClick={() => setImportModalOpen(false)}><Ico n="x" size={14} /></button></div><div className="drop p-6 rounded-2xl text-center cursor-pointer space-y-2" style={{
          border: '2px dashed var(--line)'
        }} onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }} onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            handleImportProjectFiles(e.dataTransfer.files);
          }
        }} onClick={triggerNativeFileImport}><div className="drop-i inline-flex items-center justify-center w-12 h-12 rounded-xl" style={{
            background: 'var(--sub)',
            color: 'var(--acc)'
          }}><Ico n="upload" size={22} /></div><div className="text-xs font-semibold">Klik untuk Memilih Berkas atau Seret & Lepas ke Sini</div><div className="text-[11px] mut">Mendukung arsip <b>.GEOVANTA</b>, serta <b>.SVG, .AI, .EPS, .PS, .PDF, .PNG, .JPG, .WEBP, .GIF</b></div></div></div></div>, document.body)}{storageModalOpen && storageStats && ReactDOM.createPortal(<div className="ov in" onPointerDown={e => {
      if (e.target === e.currentTarget) setStorageModalOpen(false);
    }}><div className="hp" role="dialog" aria-label="Informasi Penyimpanan Workspace" style={{
        maxWidth: 460
      }}><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{
              background: 'var(--sub)',
              color: 'var(--acc)'
            }}><Ico n="database" size={16} /></span><div><div className="text-sm font-semibold">Informasi Penyimpanan Lokal</div><div className="text-[11px] mut">IndexedDB Engine (geovanta_workspace v1)</div></div></div><button type="button" className="btn sec" style={{
            padding: 0,
            width: 30,
            height: 30,
            borderRadius: '50%'
          }} onClick={() => setStorageModalOpen(false)}><Ico n="x" size={14} /></button></div><div className="space-y-2.5 text-xs"><div className="ws-stat-row"><span className="mut">Pemakaian Proyek Geovanta</span><span className="font-mono font-semibold">{formatBytes(storageStats.localProjectBytes)}</span></div><div className="ws-stat-row"><span className="mut">Estimasi Total Origin Storage</span><span className="font-mono font-semibold">{formatBytes(storageStats.usageBytes)}</span></div><div className="ws-stat-row"><span className="mut">Estimasi Kapasitas Tersedia (Browser Quota)</span><span className="font-mono font-semibold">{storageStats.quotaBytes ? formatBytes(storageStats.quotaBytes) : 'Dinamis (Sesuai Perangkat)'}</span></div><div className="ws-stat-row"><span className="mut">Jumlah Proyek Aktif / Sampah</span><span className="font-mono font-semibold">{storageStats.projectCount} aktif · {storageStats.trashCount} di sampah</span></div><div className="ws-stat-row"><span className="mut">Jumlah Aset Gambar (Blob)</span><span className="font-mono font-semibold">{storageStats.assetCount} aset</span></div><div className="ws-stat-row"><span className="mut">Status Persistent Storage</span><span className="font-mono font-semibold" style={{
              color: storageStats.persisted ? 'var(--acc)' : 'var(--fg)'
            }}>{storageStats.persisted ? 'Aktif (Persisted)' : 'Standar Browser'}</span></div></div><div className="flex items-center justify-between gap-2 mt-4 pt-3" style={{
          borderTop: '1px solid var(--line)'
        }}>{!storageStats.persisted && storageStats.persistSupported ? <button type="button" className="btn sec text-xs" onClick={async () => {
            const granted = await ProjectRepository.requestPersistentStorage();
            const nextStats = await ProjectRepository.getStorageStats();
            setStorageStats(nextStats);
            flash && flash(granted ? 'Persistent storage diaktifkan oleh browser' : 'Browser menggunakan kebijakan penyimpanan standar');
          }}>Minta Persistent Storage</button> : <span />}<button type="button" className="btn pri text-xs px-4" onClick={() => setStorageModalOpen(false)}>Tutup</button></div></div></div>, document.body)}</div>;
};

export { WorkspaceHome };
export default WorkspaceHome;
