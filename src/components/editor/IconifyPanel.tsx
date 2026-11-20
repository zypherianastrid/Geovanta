/**
 * @file src/components/editor/IconifyPanel.tsx
 * @description Panel & Modal Popup "Icons" Iconify:
 * Kolom pencarian + dropdown kategori & koleksi + grid thumbnail besar & berjarak +
 * scrolling vertikal + navigasi pagination + baris "Terakhir dipakai" + lisensi.
 */
import React, { useState, useEffect, useRef } from 'react';
import { CustomTextBox } from '../ui/CustomTextBox.tsx';
import { Select } from '../ui/SelectDropdown.tsx';
import { Ico } from '../ui/IconGlyphs.tsx';
import { searchIcons, searchIconsFiltered, listCollections, loadSet, buildIconSvg, isPaletteIcon, probeOnline } from '../../renderer/iconifyClient.tsx';

const BROWSE_DEFAULT_PREFIX = 'material-symbols';
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 96;
const PAGE_SIZE = 96;
const THUMB_PX = 48;
const RECENT_MAX = 12;

// In-memory cache data URI dari string SVG agar render, scroll, dan ganti tab instan
const SVG_DATA_URI_CACHE = new Map<string, string>();

// Data URI dari string SVG (data, bukan HTML). null bila ikon
// tidak ada di set / SVG gagal dirakit: ikon itu tidak dirender.
const svgDataUri = (fullName: string, setData: any) => {
  const cached = SVG_DATA_URI_CACHE.get(fullName);
  if (cached) return cached;
  try {
    const svg = buildIconSvg(fullName, setData);
    if (!svg) return null;
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    if (SVG_DATA_URI_CACHE.size > 3000) {
      const first = SVG_DATA_URI_CACHE.keys().next().value;
      if (first) SVG_DATA_URI_CACHE.delete(first);
    }
    SVG_DATA_URI_CACHE.set(fullName, uri);
    return uri;
  } catch (e) {
    return null;
  }
};

// Komponen tombol thumbnail memoized dengan CSS hover murni tanpa per-element inline JS event listeners
const IconThumb = React.memo(({
  fullName,
  setData,
  iconObj,
  testid,
  onInsert
}: any) => {
  const uri = svgDataUri(fullName, setData);
  if (!uri) return null;
  return (
    <button
      type="button"
      className="ic-thumb-btn"
      data-testid={testid}
      title={fullName}
      aria-label={fullName}
      onClick={() => onInsert(iconObj)}
    >
      <img
        src={uri}
        alt={fullName}
        width={THUMB_PX}
        height={THUMB_PX}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      />
    </button>
  );
});

// Awalan pesan error klien yang DIJAMIN kontekstual per panggilan
const CONTEXTUAL_ERROR_PREFIXES = [
  'Perlu internet untuk ',
  'Pencarian ikon ',
  'Memuat daftar koleksi ikon ',
  'Gagal memuat daftar koleksi ikon ',
  'Memuat set ikon ',
  'Gagal memuat set ikon ',
  'Set ikon ',
  'Prefix set ikon ',
  'Kata kunci pencarian ikon '
];

const toPanelError = (err, genericMessage) => {
  const msg = err?.message;
  if (typeof msg === 'string' && CONTEXTUAL_ERROR_PREFIXES.some(p => msg.startsWith(p))) return msg;
  return genericMessage;
};

const DEFAULT_ICON_CATEGORIES = [
  'General',
  'Interface & UI',
  'Arrows & Navigation',
  'Brands & Social',
  'Communication & Chat',
  'Media & Audio',
  'Commerce & Shopping',
  'Devices & Tech',
  'Files & Documents',
  'Maps & Places',
  'Weather & Nature',
  'Editor & Tools',
  'Emoji & Emoticons',
  'Security & Privacy',
  'Health & Medical',
  'Education & Science',
  'Food & Beverage',
  'Travel & Transport'
];

const collectionsInCategory = (collections, category) => {
  const list = Array.isArray(collections) ? collections : [];
  if (!category) return list;
  if (category === '__other__' || category === 'Lainnya') return list.filter(c => !c?.category);
  const catLower = category.toLowerCase();
  return list.filter(c => {
    if (!c?.category) return false;
    const itemCat = String(c.category).toLowerCase();
    if (itemCat === catLower) return true;
    const words = catLower.split(/[\s\/,&+]+/).filter(w => w.length > 2);
    return words.some(w => itemCat.includes(w));
  });
};

const categoryOptions = (collections, L) => {
  const list = Array.isArray(collections) ? collections : [];
  const dynamicCats = list.map(c => c?.category).filter(c => typeof c === 'string' && c);
  const combined = [...new Set([...DEFAULT_ICON_CATEGORIES, ...dynamicCats])].sort((a, b) => a.localeCompare(b));
  const opts = [['', L?.icAllCategories || 'Semua kategori'], ...combined.map(c => [c, c])];
  opts.push(['__other__', L?.icOtherCategory || 'Lainnya']);
  return opts;
};

const IconifyPanel = ({
  open = true,
  onInsert,
  onClose,
  status = 'loading',
  L,
  recentIcons = []
}) => {
  const [query, setQuery] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [collections, setCollections] = useState([]);
  const [browseSet, setBrowseSet] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchExhausted, setSearchExhausted] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sets, setSets] = useState({});
  const [setsError, setSetsError] = useState(null);
  const searchAbortRef = useRef(null);
  const setsRef = useRef({});

  const [netStatus, setNetStatus] = useState(status);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    probeOnline().then(ok => { if (!cancelled) setNetStatus(ok ? 'online' : 'offline'); });
    const onOn = () => setNetStatus('online');
    const onOff = () => setNetStatus('offline');
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOn);
      window.removeEventListener('offline', onOff);
    };
  }, [open]);

  const mode = query.trim() ? 'search' : 'browse';
  const visibleCollections = collectionsInCategory(collections, selectedCategory);
  const browsePrefix = selectedPrefix || (selectedCategory ? visibleCollections[0]?.prefix : undefined) || BROWSE_DEFAULT_PREFIX;
  const recentNames = (Array.isArray(recentIcons) ? recentIcons : []).slice(0, RECENT_MAX);

  const handleCategoryChange = v => {
    setSelectedCategory(v);
    setBrowsePage(1);
    setSearchPage(1);
    if (v && selectedPrefix) {
      const col = collections.find(c => c.prefix === selectedPrefix);
      const inNewCategory = v === '__other__' ? !col?.category : col?.category === v;
      if (!inNewCategory) setSelectedPrefix('');
    }
  };

  /* Esc menutup modal */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-testid="text-edit-overlay"]')) return;
      if (document.querySelector('.flt')) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Daftar koleksi sekali saat panel dibuka */
  useEffect(() => {
    if (!open || netStatus !== 'online') return;
    let cancelled = false;
    listCollections().then(cs => { if (!cancelled) setCollections(cs); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, netStatus]);

  /* Muat set koleksi yang sedang ditelusur */
  useEffect(() => {
    if (!open || mode !== 'browse' || netStatus !== 'online') return;
    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    loadSet(browsePrefix)
      .then(sd => { if (!cancelled) { setBrowseSet(sd); setBrowseLoading(false); } })
      .catch(e => { if (!cancelled) { setBrowseError(toPanelError(e, L.icErrorGeneric)); setBrowseLoading(false); } });
    return () => { cancelled = true; };
  }, [open, mode, browsePrefix, netStatus]);

  const ensureSets = prefixes => {
    const missing = prefixes.filter(p => p && !setsRef.current[p]);
    if (!missing.length) return Promise.resolve([]);
    return Promise.all(missing.map(pfx => loadSet(pfx)
      .then(sd => { setsRef.current[pfx] = sd; return [pfx, sd]; })
      .catch(e => { setSetsError(prev => prev || toPanelError(e, L.icErrorGeneric)); return null; })
    )).then(loaded => {
      const got = loaded.filter(Boolean);
      if (got.length) setSets(prev => { const next = {...prev}; for (const [p, sd] of got) next[p] = sd; return next; });
      return got;
    });
  };

  /* Cari dengan debounce dan offset pagination */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchExhausted(false);
      setSearchError(null);
      setSetsError(null);
      setSearching(false);
      return;
    }
    if (netStatus !== 'online') return;
    const t = setTimeout(() => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearching(true);
      setSearchError(null);
      setSetsError(null);
      const start = (searchPage - 1) * SEARCH_LIMIT;
      const runSearch = selectedCategory
        ? searchIconsFiltered(q, {category: selectedCategory, collections, limit: SEARCH_LIMIT, start, signal: controller.signal})
            .then(res => ({icons: res.icons, total: res.total, exhausted: res.exhausted}))
        : searchIcons(q, {prefix: selectedPrefix || undefined, limit: SEARCH_LIMIT, start, signal: controller.signal})
            .then(res => ({icons: res.icons, total: res.total, exhausted: (start + res.icons.length) >= res.total}));
      runSearch
        .then(res => {
          if (controller.signal.aborted) return;
          setSearchResults(res.icons);
          setSearchTotal(res.total);
          setSearchExhausted(res.exhausted);
          return ensureSets([...new Set(res.icons.map(i => i.prefix).filter(Boolean))]);
        })
        .catch(e => {
          if (e?.name === 'AbortError') return;
          setSearchError(toPanelError(e, L.icErrorGeneric));
          setSearchResults([]);
        })
        .finally(() => { if (searchAbortRef.current === controller) setSearching(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [query, selectedPrefix, selectedCategory, collections, netStatus, searchPage]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const collectionByPrefix = pfx => collections.find(c => c.prefix === pfx);
  const renderableSearch = searchResults
    .filter(r => sets[r.prefix])
    .map(r => ({...r, setData: sets[r.prefix]}));
  const browseNames = browseSet ? Object.keys(browseSet.icons || {}) : [];
  const totalBrowsePages = Math.max(1, Math.ceil(browseNames.length / PAGE_SIZE));
  const activeBrowsePage = Math.min(browsePage, totalBrowsePages);
  const pagedBrowseNames = browseNames.slice((activeBrowsePage - 1) * PAGE_SIZE, activeBrowsePage * PAGE_SIZE);

  const totalSearchPages = Math.max(1, Math.ceil(searchTotal / SEARCH_LIMIT));
  const activeSearchPage = Math.min(searchPage, totalSearchPages);

  let licenseNote = null;
  const singleCollection = mode === 'browse'
    ? collectionByPrefix(browsePrefix)
    : (selectedPrefix ? collectionByPrefix(selectedPrefix) : null);
  if (singleCollection?.license) {
    licenseNote = L.icLicenseOne.replace('{name}', singleCollection.name).replace('{license}', singleCollection.license);
  } else if (mode === 'search' && !selectedPrefix && renderableSearch.length > 0) {
    const licenses = [...new Set(renderableSearch.map(r => r.license).filter(Boolean))];
    if (licenses.length) licenseNote = L.icLicenseMany.replace('{licenses}', licenses.join(', '));
  }

  const thumbButton = (fullName: string, setData: any, iconObj: any, testid: string) => (
    <IconThumb
      key={fullName}
      fullName={fullName}
      setData={setData}
      iconObj={iconObj}
      testid={testid}
      onInsert={onInsert}
    />
  );

  const renderPagination = (curPage, totalPages, totalCount, onSelectPage) => {
    const maxPages = Math.max(1, totalPages);
    const items = [];
    if (maxPages <= 5) {
      for (let i = 1; i <= maxPages; i++) items.push(i);
    } else {
      if (curPage <= 4) {
        for (let i = 1; i <= 5; i++) items.push(i);
        items.push('ellipsis');
        items.push(maxPages);
      } else if (curPage >= maxPages - 3) {
        items.push(1);
        items.push('ellipsis');
        for (let i = maxPages - 4; i <= maxPages; i++) items.push(i);
      } else {
        items.push(1);
        items.push('ellipsis-start');
        items.push(curPage - 1);
        items.push(curPage);
        items.push(curPage + 1);
        items.push('ellipsis-end');
        items.push(maxPages);
      }
    }

    return (
      <div
        className="flex items-center justify-between gap-3 pt-2 pb-1"
        data-testid="ic-pagination"
        style={{ borderTop: '1px solid var(--line)', marginTop: 'auto', paddingTop: 10 }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {items.map((it, idx) => {
            if (typeof it === 'string' && it.startsWith('ellipsis')) {
              const jumpTarget = it === 'ellipsis-start'
                ? Math.max(1, curPage - 5)
                : Math.min(maxPages, curPage + 5);
              return (
                <button
                  key={`ellipsis-${idx}`}
                  type="button"
                  title="Lompat halaman"
                  onClick={() => onSelectPage(jumpTarget)}
                  style={{
                    minWidth: 28,
                    height: 32,
                    padding: '0 4px',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--mut)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ...
                </button>
              );
            }
            const p = it;
            const isActive = p === curPage;
            return (
              <button
                key={p}
                type="button"
                data-testid={`ic-page-${p}`}
                onClick={() => onSelectPage(p)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'var(--acc, #13b152)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--ink)',
                  border: isActive ? '1px solid var(--acc, #13b152)' : '1px solid var(--line, #e4e4e7)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.12s ease, border-color 0.12s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--sub, rgba(15, 23, 42, 0.05))';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs mut" data-testid="ic-page-info">
          {typeof totalCount === 'number' ? (
            <span data-testid="ic-count">
              ({L.icResults.replace('{n}', String(totalCount))})
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fig-isec fade"
      data-testid="ic-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0, border: 'none' }}
    >
      <style>{`
        .ic-thumb-btn {
          width: 62px;
          height: 62px;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: transparent;
          border: 1px solid transparent;
          box-shadow: none;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
          contain: content;
          content-visibility: auto;
          contain-intrinsic-size: 62px 62px;
          will-change: transform;
          transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1), background-color 0.12s ease, border-color 0.12s ease;
        }
        .ic-thumb-btn:hover {
          background-color: var(--sub, rgba(15, 23, 42, 0.07));
          border-color: color-mix(in srgb, var(--acc, #13b152) 35%, var(--line, #e4e4e7));
          transform: scale(1.08);
        }
        .ic-thumb-btn:focus-visible {
          outline: 2px solid var(--acc, #13b152);
          outline-offset: 1px;
        }
        .ic-scroll-box {
          overscroll-behavior: contain;
          will-change: scroll-position;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
      <div className="fig-isec-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{L.icTitle}</span>
        </div>
        <button
          type="button"
          className="fig-ibtn"
          onClick={onClose}
          aria-label={L.frClose || 'Tutup'}
          data-testid="ic-close"
          style={{ width: 34, height: 34, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
        <div>
          <div className="fld flex items-center px-3 py-1.5 gap-2" style={{ height: 40, borderRadius: 10 }} data-testid="ic-search">
            <span className="shrink-0 flex items-center text-muted-foreground opacity-60"><Ico n="search" size={15} /></span>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <CustomTextBox
                value={query}
                ariaLabel={L.icSearchPlaceholder}
                placeholder={L.icSearchPlaceholder}
                onChange={v => {
                  setQuery(v);
                  setSearchPage(1);
                }}
              />
            </div>
          </div>
          <div className="text-xs mut mt-1.5">{L.icSearchHint}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 14 }}>
          <div>
            <div className="fig-sub-lbl flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
              <Ico n="layers" size={13} />
              <span>{L.icCategory}</span>
            </div>
            <div data-testid="ic-category">
              <Select value={selectedCategory} options={categoryOptions(collections, L)} on={handleCategoryChange} />
            </div>
          </div>
          <div>
            <div className="fig-sub-lbl flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
              <Ico n="database" size={13} />
              <span>{L.icCollection}</span>
            </div>
            <div data-testid="ic-collection">
              <Select
                value={selectedPrefix}
                searchable
                searchPlaceholder={L.icCollection}
                options={[['', L.icAllCollections], ...visibleCollections.map(c => [c.prefix, c.name])]}
                on={v => {
                  setSelectedPrefix(v);
                  setBrowsePage(1);
                  setSearchPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {netStatus === 'offline' ? (
          <div data-testid="ic-offline" className="text-xs mut py-6 text-center">{L.icOffline}</div>
        ) : mode === 'search' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            {searching ? (
              <div data-testid="ic-loading" className="text-xs mut py-6 text-center">{L.icLoading}</div>
            ) : searchError ? (
              <div data-testid="ic-error" className="text-xs py-6 text-center" style={{ color: 'var(--danger)' }}>{searchError}</div>
            ) : searchResults.length === 0 ? (
              <div data-testid="ic-empty-state" className="text-xs mut py-6 text-center">{L.icEmptySearch.replace('{q}', query.trim())}</div>
            ) : renderableSearch.length === 0 ? (
              <div data-testid="ic-error" className="text-xs py-6 text-center" style={{ color: 'var(--danger)' }}>{setsError || L.icEmptySearch.replace('{q}', query.trim())}</div>
            ) : (
              <>
                <div
                  className="ic-scroll-box"
                  style={{
                    flex: '1 1 auto',
                    minHeight: 280,
                    maxHeight: 'calc(86vh - 280px)',
                    overflowY: 'auto',
                    padding: '4px 2px',
                    marginBottom: 8
                  }}
                  data-testid="ic-scroll-area"
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
                      gap: '10px',
                      paddingBottom: 4
                    }}
                    data-testid="ic-grid"
                  >
                    {renderableSearch.map(r => thumbButton(r.name, r.setData, r, `ic-icon-${r.name}`))}
                  </div>
                </div>
                {renderPagination(
                  activeSearchPage,
                  totalSearchPages,
                  selectedCategory ? renderableSearch.length : searchTotal,
                  p => setSearchPage(p)
                )}
              </>
            )}
          </div>
        ) : browseLoading ? (
          <div data-testid="ic-loading" className="text-xs mut py-6 text-center">{L.icLoading}</div>
        ) : browseError ? (
          <div data-testid="ic-error" className="text-xs py-6 text-center" style={{ color: 'var(--danger)' }}>{browseError}</div>
        ) : browseNames.length === 0 ? (
          <div data-testid="ic-empty-state" className="text-xs mut py-6 text-center">{L.icEmptyBrowse}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <div
              className="ic-scroll-box"
              style={{
                flex: '1 1 auto',
                minHeight: 280,
                maxHeight: 'calc(86vh - 280px)',
                overflowY: 'auto',
                padding: '4px 2px',
                marginBottom: 8
              }}
              data-testid="ic-scroll-area"
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
                  gap: '10px',
                  paddingBottom: 4
                }}
                data-testid="ic-grid"
              >
                {pagedBrowseNames.map(short =>
                  thumbButton(
                    `${browsePrefix}:${short}`,
                    browseSet,
                    {
                      name: `${browsePrefix}:${short}`,
                      prefix: browsePrefix,
                      palette: isPaletteIcon(short, browseSet),
                      license: collectionByPrefix(browsePrefix)?.license ?? null
                    },
                    `ic-icon-${browsePrefix}:${short}`
                  )
                )}
              </div>
            </div>
            {renderPagination(
              activeBrowsePage,
              totalBrowsePages,
              browseNames.length,
              p => setBrowsePage(p)
            )}
          </div>
        )}

        {licenseNote ? <div data-testid="ic-license" className="text-xs mut" style={{ marginTop: 8 }}>{licenseNote}</div> : null}
      </div>
    </div>
  );
};

export { IconifyPanel, toPanelError, categoryOptions, collectionsInCategory };
export default IconifyPanel;
