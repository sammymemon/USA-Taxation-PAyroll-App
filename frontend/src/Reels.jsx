import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, ChevronUp, ChevronDown, RefreshCcw, Loader2, Sparkles } from 'lucide-react';

// ── Fallback static list (used on first load & as seed) ─────────────────────
const SEED_IDS = [
    'Y0W3fsuyuqM', 'iEhhB30Dwcg', 'OYbA90nf4ZE', 'PNe1BW75C9k',
    'Qm-78U3yEn0', 'MafYa5E0-dg', 'Nl41Zb5X6DQ', 'np2SxxYJsdk',
    'x6WW3RA0C0s', 'JWPXtBIWe8U', '9qbOFsgql_A', 'WerJYgHhRX0',
    'ChpQnQEHNvM', 'ZIguubd1p9E', 'ozv3wQSlYLE', '5QuesNWCfFg',
    'rpKIqpqsYWA', 'WtbXTq28nVE', 'QSKrpVOxo_Q', 'zTebAYzXo8Q',
];

const QUERY_POOL = [
    'USA payroll processing shorts', 'USA taxation basics shorts', 'USA bookkeeping standards shorts',
    'KPO accounting interview questions shorts', 'Form 941 payroll taxes shorts', 'QuickBooks online tips shorts',
    'federal payroll tax USA shorts', '1099 vs W2 explained shorts', 'accounts payable process shorts',
    'IRS tax season tips shorts', 'FICA tax explained shorts', 'US GAAP bookkeeping shorts',
    'accounting interview questions and answers shorts', 'KPO accounting work shorts',
    'bank reconciliation bookkeeping shorts', 'month end close accounting shorts'
];

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
                        #USA_ACCOUNTING
                    </span>
                    <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        #KPO_INTERVIEW
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

    // ── Ultra-Robust Fetch Logic ─────────────────────────────────────────────
    const fetchShortsBatch = useCallback(async (append = true) => {
        if (fetchStatus === 'loading') return;
        setFetchStatus('loading');

        const groqKey = localStorage.getItem('groqApiKey');
        let selectedQuery = "";

        // 1. Try AI Query Generation
        if (groqKey) {
            try {
                const aiPrompt = [
                    { role: 'system', content: 'You are a USA CPAs mentor. Return exactly 3 specific YouTube search terms for Shorts regarding USA Payroll, Tax or Bookkeeping. Separate them with | character. Do not say anything else.' },
                    { role: 'user', content: 'Help me find educational shorts.' }
                ];
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: aiPrompt, temperature: 0.9 })
                });
                const aiData = await res.json();
                const aiTerms = aiData.choices[0].message.content.split('|').map(t => t.trim() + " shorts");
                selectedQuery = aiTerms[Math.floor(Math.random() * aiTerms.length)];
            } catch (e) {
                console.warn("AI query generation failed:", e);
            }
        }

        if (!selectedQuery) {
            selectedQuery = QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
        }

        // 2. Fetch with Proxy Fallback Chain
        // We use AllOrigins but with a cache-buster
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedQuery)}&cache_bust=${Date.now()}`;
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(ytUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytUrl)}`
        ];

        let foundIds = [];

        for (const proxyUrl of proxies) {
            try {
                const res = await fetch(proxyUrl);
                const data = await res.json();
                const html = typeof data === 'string' ? data : (data.contents || "");
                
                // Super robust regex to find video IDs even in escaped JSON
                // Matches "videoId":"XXXXX" or "videoId\":\"XXXXX\" or ?v=XXXXX
                const vidMatches = html.matchAll(/(?:videoId|v=|embed\/|shorts\/)["\\:?]*([a-zA-Z0-9_-]{11})/g);
                const ids = [...new Set([...vidMatches].map(m => m[1]))];
                
                if (ids.length > 3) {
                    foundIds = ids.slice(0, 15);
                    break;
                }
            } catch (e) {
                console.warn(`Proxy ${proxyUrl} failed:`, e);
            }
        }

        if (foundIds.length > 0) {
            setReelIds(prev => {
                const combined = append ? [...prev, ...foundIds] : [...foundIds, ...SEED_IDS];
                const unique = [...new Set(combined)];
                localStorage.setItem('reelIds', JSON.stringify(unique));
                return unique;
            });
            setFetchStatus('done');
            setTimeout(() => setFetchStatus('idle'), 2000);
        } else {
            setFetchStatus('error');
            setTimeout(() => setFetchStatus('idle'), 2000);
        }
    }, [fetchStatus]);

    // Initial load
    useEffect(() => {
        fetchShortsBatch(true);
    }, []);

    // ── Nav & Scroll Logic ───────────────────────────────────────────────────
    const goTo = useCallback((idx) => {
        if (!containerRef.current) return;
        const clamped = Math.max(0, Math.min(idx, reelIds.length - 1));
        containerRef.current.scrollTo({ top: clamped * containerRef.current.clientHeight, behavior: 'smooth' });
        setActiveIndex(clamped);
    }, [reelIds.length]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
        if (idx !== activeIndex) setActiveIndex(idx);
        
        // Auto-fetch more when near bottom
        if (idx >= reelIds.length - 3 && fetchStatus === 'idle') {
            fetchShortsBatch(true);
        }
    }, [activeIndex, reelIds.length, fetchStatus, fetchShortsBatch]);

    const onTouchEnd = (e) => {
        if (touchStartY.current === null) return;
        const dy = touchStartY.current - e.changedTouches[0].clientY;
        const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
        if (Math.abs(dy) > 40 && Math.abs(dy) > dx * 1.5) {
            goTo(dy > 0 ? activeIndex + 1 : activeIndex - 1);
        }
        touchStartY.current = null;
    };

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden select-none">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 pt-4 pb-12 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
                <Link to="/" className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20 pointer-events-auto active:scale-90 transition-transform">
                    <ArrowLeft size={20} />
                </Link>

                <div className="flex flex-col items-center gap-1 drop-shadow-lg">
                    <div className="flex items-center gap-2 text-sm font-black tracking-tight">
                        <Video size={18} className="text-pink-500 animate-pulse" fill="currentColor" />
                        USA SHORTS AI
                    </div>
                    {fetchStatus === 'loading' && (
                        <div className="text-[10px] text-pink-400 font-bold animate-pulse uppercase tracking-widest flex items-center gap-1">
                             AI Searching...
                        </div>
                    )}
                </div>

                <button
                    onClick={() => fetchShortsBatch(false)}
                    disabled={fetchStatus === 'loading'}
                    className="p-3 bg-pink-600/20 backdrop-blur-md rounded-full border border-pink-500/40 pointer-events-auto active:rotate-180 transition-all disabled:opacity-50"
                >
                    <RefreshCcw size={20} className={fetchStatus === 'loading' ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={handleScroll}
                onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={onTouchEnd}
            >
                {reelIds.map((id, idx) => (
                    <div key={`${id}-${idx}`} className="w-full snap-start snap-always" style={{ height: '100dvh' }}>
                        <ReelSlide id={id} idx={idx} activeIndex={activeIndex} total={reelIds.length} />
                    </div>
                ))}
            </div>

            {/* AI Magic Float Button */}
            <div className="absolute right-4 bottom-24 z-50 pointer-events-auto">
                 <button 
                    onClick={() => fetchShortsBatch(true)}
                    className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-pink-500/40 border-2 border-white/20 animate-bounce active:scale-95"
                    title="AI Magic Load"
                 >
                    <Sparkles size={24} className="text-white" fill="currentColor" />
                 </button>
            </div>

            {/* Simple indicators */}
            <div className="absolute right-4 bottom-1/2 translate-y-1/2 flex flex-col gap-4 z-40 pointer-events-auto">
                 <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 disabled:opacity-20"><ChevronUp size={24}/></button>
                 <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex >= reelIds.length - 1} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 disabled:opacity-20"><ChevronDown size={24}/></button>
            </div>
        </div>
    );
}
