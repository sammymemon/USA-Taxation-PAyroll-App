import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, ChevronUp, ChevronDown, RefreshCcw, Loader2 } from 'lucide-react';

// ── Fallback static list (used on first load & as seed) ─────────────────────
const SEED_IDS = [
    'Y0W3fsuyuqM', 'iEhhB30Dwcg', 'OYbA90nf4ZE', 'PNe1BW75C9k',
    'Qm-78U3yEn0', 'MafYa5E0-dg', 'Nl41Zb5X6DQ', 'np2SxxYJsdk',
    'x6WW3RA0C0s', 'JWPXtBIWe8U', '9qbOFsgql_A', 'WerJYgHhRX0',
    'ChpQnQEHNvM', 'ZIguubd1p9E', 'ozv3wQSlYLE', '5QuesNWCfFg',
    'rpKIqpqsYWA', 'WtbXTq28nVE', 'QSKrpVOxo_Q', 'zTebAYzXo8Q',
];

// ── Fetch fresh IDs from YouTube search (no API key needed) ─────────────────
async function fetchYTShortIds(query) {
    try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const matches = [...data.contents.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
        const ids = [...new Set(matches.map(m => m[1]))].slice(0, 20);
        return ids.length >= 5 ? ids : null;
    } catch {
        return null;
    }
}

// ── Single Reel slide ────────────────────────────────────────────────────────
const ReelSlide = React.memo(({ id, idx, activeIndex, total }) => {
    const isActive = activeIndex === idx;
    const isNear = Math.abs(activeIndex - idx) <= 1;

    return (
        <div className="relative flex-shrink-0 w-full bg-black" style={{ height: '100%' }}>
            {isNear ? (
                <iframe
                    className="w-full h-full border-none"
                    src={`https://www.youtube.com/embed/${id}?autoplay=${isActive ? 1 : 0}&loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1&playsinline=1&mute=0`}
                    title={`Bookkeeping Short ${idx + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                    <Loader2 className="text-zinc-700 animate-spin" size={32} />
                </div>
            )}

            {/* Bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none px-4 py-5 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        #Bookkeeping
                    </span>
                    <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        #USAccounting
                    </span>
                </div>
                <p className="text-white/60 text-xs font-plex">{idx + 1} / {total}</p>
            </div>
        </div>
    );
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reels() {
    const [reelIds, setReelIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('reelIds')) || SEED_IDS; } catch { return SEED_IDS; }
    });
    const [activeIndex, setActiveIndex] = useState(0);
    const [fetchStatus, setFetchStatus] = useState('idle'); // idle | loading | done | error
    const containerRef = useRef(null);
    const touchStartY = useRef(null);
    const touchStartX = useRef(null);

    // ── Auto-fetch fresh IDs on mount ────────────────────────────────────────
    const refreshReels = useCallback(async () => {
        setFetchStatus('loading');
        const queries = [
            // Core Bookkeeping
            'bookkeeping tips shorts',
            'bookkeeping for beginners shorts',
            'bookkeeping basics explained shorts',
            'small business bookkeeping shorts',
            'virtual bookkeeping shorts',
            // Accounting
            'accounting basics shorts',
            'accounting concepts shorts',
            'accounting for beginners shorts',
            'accounting equation shorts',
            'double entry bookkeeping shorts',
            'journal entries accounting shorts',
            'general ledger accounting shorts',
            // US Taxes & Compliance
            'US payroll tax shorts',
            'payroll processing shorts',
            '1099 vs W2 shorts',
            '1099 NEC filing shorts',
            'sales tax nexus shorts',
            'SOX compliance shorts',
            'IRS tax tips shorts',
            'W9 form explained shorts',
            'GAAP accounting shorts',
            // AP / AR
            'accounts payable shorts',
            'accounts receivable shorts',
            'invoice processing shorts',
            'three way matching accounts payable shorts',
            'vendor payment shorts',
            'collections AR shorts',
            // Tools
            'QuickBooks tutorial shorts',
            'QuickBooks online tips shorts',
            'QuickBooks payroll shorts',
            'Excel accounting shorts',
            'NetSuite ERP shorts',
            'SAP accounting shorts',
            'Xero accounting shorts',
            // Fixed Assets & GL
            'fixed assets depreciation shorts',
            'bank reconciliation shorts',
            'month end close accounting shorts',
            'accruals prepaid accounting shorts',
            // Career
            'accounting career tips shorts',
            'KPO accounting work shorts',
            'remote bookkeeping job shorts',
            'accounting interview tips shorts',
            'CPA exam tips shorts',
        ];
        const q = queries[Math.floor(Math.random() * queries.length)];
        const ids = await fetchYTShortIds(q);
        if (ids && ids.length >= 5) {
            // Merge with seeds so we always have content
            const merged = [...new Set([...ids, ...SEED_IDS])];
            setReelIds(merged);
            localStorage.setItem('reelIds', JSON.stringify(merged));
            setFetchStatus('done');
        } else {
            setFetchStatus('error');
        }
    }, []);

    useEffect(() => { refreshReels(); }, []);

    // ── Scroll to index ──────────────────────────────────────────────────────
    const goTo = useCallback((idx) => {
        if (!containerRef.current) return;
        const clamped = Math.max(0, Math.min(idx, reelIds.length - 1));
        containerRef.current.scrollTo({ top: clamped * containerRef.current.clientHeight, behavior: 'smooth' });
        setActiveIndex(clamped);
    }, [reelIds.length]);

    // ── Scroll event ─────────────────────────────────────────────────────────
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
        setActiveIndex(prev => prev !== idx ? idx : prev);
    }, []);

    // ── Touch swipe ──────────────────────────────────────────────────────────
    const onTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e) => {
        if (touchStartY.current === null) return;
        const dy = touchStartY.current - e.changedTouches[0].clientY;
        const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
        if (Math.abs(dy) > 50 && Math.abs(dy) > dx * 1.5) {
            goTo(dy > 0 ? activeIndex + 1 : activeIndex - 1);
        }
        touchStartY.current = null;
        touchStartX.current = null;
    };

    // ── auto-load more when near end ─────────────────────────────────────────
    useEffect(() => {
        if (activeIndex >= reelIds.length - 3 && fetchStatus === 'idle') {
            refreshReels();
        }
    }, [activeIndex, reelIds.length, fetchStatus, refreshReels]);

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden select-none">

            {/* ── Header ── */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-3 pt-3 pb-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <Link
                    to="/"
                    className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/20 pointer-events-auto active:scale-95 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <ArrowLeft size={20} />
                </Link>

                <div className="flex items-center gap-2 text-sm font-bold drop-shadow">
                    <Video size={16} className="text-pink-400" fill="currentColor" />
                    Bookkeeping Shorts
                </div>

                <button
                    onClick={() => { setFetchStatus('idle'); refreshReels(); }}
                    disabled={fetchStatus === 'loading'}
                    className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/20 pointer-events-auto active:scale-95 transition-transform disabled:opacity-50"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    title="Load fresh shorts"
                >
                    {fetchStatus === 'loading'
                        ? <Loader2 size={18} className="animate-spin" />
                        : <RefreshCcw size={18} />}
                </button>
            </div>

            {/* ── Reel scroll container ── */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={handleScroll}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {reelIds.map((id, idx) => (
                    <div key={`${id}-${idx}`} className="w-full snap-start snap-always" style={{ height: '100dvh' }}>
                        <ReelSlide id={id} idx={idx} activeIndex={activeIndex} total={reelIds.length} />
                    </div>
                ))}

                {/* Loading more indicator at bottom */}
                <div className="w-full flex items-center justify-center py-6 bg-black snap-start" style={{ height: '100dvh' }}>
                    <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <Loader2 className="animate-spin" size={32} />
                        <p className="text-sm font-plex font-bold uppercase tracking-widest">Loading More...</p>
                        <button
                            onClick={() => { setFetchStatus('idle'); refreshReels(); }}
                            className="mt-2 px-6 py-3 bg-pink-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <RefreshCcw size={16} /> Refresh Shorts
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Side nav buttons ── */}
            <div className="absolute right-3 bottom-1/2 translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-auto">
                <button
                    onPointerDown={(e) => { e.preventDefault(); goTo(activeIndex - 1); }}
                    disabled={activeIndex === 0}
                    className="w-11 h-11 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                    <ChevronUp size={22} />
                </button>
                <button
                    onPointerDown={(e) => { e.preventDefault(); goTo(activeIndex + 1); }}
                    disabled={activeIndex >= reelIds.length - 1}
                    className="w-11 h-11 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                    <ChevronDown size={22} />
                </button>
            </div>

            {/* ── Fetch status toast ── */}
            {fetchStatus === 'done' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500/90 text-white text-xs font-bold rounded-full shadow-lg animate-in fade-in slide-in-from-bottom pointer-events-none">
                    ✅ Fresh shorts loaded!
                </div>
            )}
            {fetchStatus === 'error' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/90 text-white text-xs font-bold rounded-full shadow-lg pointer-events-none">
                    ⚠️ Using offline list
                </div>
            )}
        </div>
    );
}
