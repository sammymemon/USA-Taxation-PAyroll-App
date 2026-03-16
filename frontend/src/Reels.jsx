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
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const html = data.contents;
        
        // Match videoId pattern in YouTube's initial data blobs
        const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const matches = [...html.matchAll(videoIdRegex)];
        let ids = [...new Set(matches.map(m => m[1]))];

        // Backup pattern if first one yields little
        if (ids.length < 5) {
            const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
            const watchMatches = [...html.matchAll(watchRegex)];
            ids = [...new Set([...ids, ...watchMatches.map(m => m[1])])];
        }

        console.log(`AI found ${ids.length} videos for: ${query}`);
        return ids.length > 0 ? ids.slice(0, 15) : null;
    } catch (err) {
        console.error("Fetch error for YT IDs:", err);
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

    // ── Auto-fetch fresh IDs on mount (Infinite expansion logic with AI) ──────
    const refreshReels = useCallback(async (append = true) => {
        if (fetchStatus === 'loading') return;
        setFetchStatus('loading');
        
        // 1. Get Groq API Key if user has entered it in Interview Mode
        const groqKey = localStorage.getItem('groqApiKey');
        let selectedQuery = "";

        if (groqKey && (Math.random() > 0.3 || !append)) { 
            // 70% chance to use AI if key exists, OR always use AI on manual refresh
            try {
                const aiPrompt = [
                    { role: 'system', content: 'You are a USA Bookkeeping expert. Suggest 5 extremely specific search terms for YouTube Shorts that would help someone learning USA Payroll, Taxation, or Bookkeeping. Each term must be under 6 words and end with "shorts". Return only a comma separated list.' },
                    { role: 'user', content: 'Generate fresh search terms.' }
                ];
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: aiPrompt, temperature: 0.9 })
                });
                const aiData = await res.json();
                const aiTerms = aiData.choices[0].message.content.split(',').map(t => t.trim());
                selectedQuery = aiTerms[Math.floor(Math.random() * aiTerms.length)];
                console.log("AI suggested search:", selectedQuery);
            } catch (e) {
                console.warn("AI Query Generation failed, falling back to static list", e);
            }
        }

        if (!selectedQuery) {
            const queries = [
                'USA payroll processing shorts', 'Form 941 payroll shorts', 'QuickBooks online tips shorts',
                'KPO accounting interview questions shorts', 'US bookkeeping basics shorts',
                '1099 vs W2 explained shorts', 'IRS tax season tips shorts', 'accounts payable process shorts'
            ];
            selectedQuery = queries[Math.floor(Math.random() * queries.length)];
        }

        // 2. Try Fetching with Proxy Fallbacks
        const proxies = [
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            (u) => `https://thingproxy.freeboard.io/fetch/${u}` // Backup proxy
        ];

        let ids = null;
        for (const proxyFn of proxies) {
            try {
                const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedQuery)}`;
                const res = await fetch(proxyFn(ytUrl));
                const data = await res.json();
                const html = data.contents || data; // Handle different proxy responses
                
                const vidRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
                const matches = [...html.matchAll(vidRegex)];
                if (matches.length > 0) {
                    ids = [...new Set(matches.map(m => m[1]))].slice(0, 10);
                    break; // Success!
                }
            } catch (e) { console.warn("Proxy failed, trying next..."); }
        }
        
        if (ids && ids.length > 0) {
            setReelIds(prev => {
                const combined = append ? [...prev, ...ids] : [...ids, ...SEED_IDS];
                const uniqueContent = [...new Set(combined)];
                localStorage.setItem('reelIds', JSON.stringify(uniqueContent));
                return uniqueContent;
            });
            setFetchStatus('done');
            setTimeout(() => setFetchStatus('idle'), 3000);
        } else {
            console.error("Failed to fetch shorts from any source/proxy.");
            setFetchStatus('error');
            setTimeout(() => setFetchStatus('idle'), 3000);
        }
    }, [fetchStatus]);

    useEffect(() => { 
        if (reelIds.length <= SEED_IDS.length) {
            refreshReels(true); 
        }
    }, []);

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
