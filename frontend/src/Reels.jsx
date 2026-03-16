import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, ChevronUp, ChevronDown, RefreshCcw, Loader2, Sparkles, Plus, X, Send } from 'lucide-react';

// ── Fallback static list (used as seed) ─────────────────────
const SEED_REELS = [
    { id: 'Y0W3fsuyuqM', tags: ['#USA_PAYROLL', '#ACCOUNTING'] },
    { id: 'iEhhB30Dwcg', tags: ['#BOOKKEEPING', '#TIPS'] },
    { id: 'OYbA90nf4ZE', tags: ['#IRS_TAXES', '#USA'] },
    { id: 'PNe1BW75C9k', tags: ['#PAYROLL_BASICS', '#HR'] },
    { id: 'Qm-78U3yEn0', tags: ['#QUICKBOOKS', '#ACCOUNTING'] },
    { id: 'MafYa5E0-dg', tags: ['#KPO_INTERVIEW', '#TIPS'] },
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
const ReelSlide = React.memo(({ reel, idx, activeIndex, total }) => {
    const { id, tags = ["#USA_ACCOUNTING", "#KPO_INTERVIEW"] } = reel;
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
                    {tags.map((tag, tIdx) => (
                        <span key={tIdx} className={`${tIdx === 0 ? 'bg-pink-500' : 'bg-white/10'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-white/60 text-xs font-plex">{idx + 1} / {total}</p>
            </div>
        </div>
    );
});

// ── Bulk Upload Modal ────────────────────────────────────────────────────────
const BulkUploadModal = ({ isOpen, onClose, onUpload, isProcessing }) => {
    const [links, setLinks] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Plus size={20} className="text-pink-500" /> Bulk Add Shorts
                        </h2>
                        <p className="text-zinc-500 text-xs mt-1">Paste multiple YT links. AI will categorize them.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <textarea 
                        className="w-full h-48 bg-black/50 border border-white/10 rounded-2xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-700 resize-none"
                        placeholder="Paste links like:&#10;https://youtube.com/shorts/abc12345678&#10;https://youtu.be/xyz98765432..."
                        value={links}
                        onChange={(e) => setLinks(e.target.value)}
                    />
                    
                    <button 
                        disabled={!links.trim() || isProcessing}
                        onClick={() => {
                            onUpload(links);
                            setLinks("");
                        }}
                        className="w-full mt-4 bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-50 disabled:grayscale py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-pink-500/20"
                    >
                        {isProcessing ? (
                            <> <Loader2 size={18} className="animate-spin" /> Processing with AI... </>
                        ) : (
                            <> <Send size={18} /> Start Bulk Import </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reels() {
    const [reels, setReels] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [fetchStatus, setFetchStatus] = useState('idle'); // idle | loading | done | error
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    
    const containerRef = useRef(null);
    const touchStartY = useRef(null);
    const touchStartX = useRef(null);

    const API_BASE = "/api";

    // Load reels from backend + fallback
    useEffect(() => {
        const loadInitial = async () => {
            const formatData = (data) => {
                if (!Array.isArray(data)) return SEED_REELS;
                return data.map(item => typeof item === 'string' ? { id: item, tags: ["#USA_ACCOUNTING", "#PRO_TIPS"] } : item);
            };

            try {
                const res = await fetch(`${API_BASE}/reels`);
                const data = await res.json();
                if (data && data.length > 0) {
                    setReels(formatData(data));
                } else {
                    const local = localStorage.getItem('reels') || localStorage.getItem('reelIds');
                    setReels(local ? formatData(JSON.parse(local)) : SEED_REELS);
                }
            } catch (e) {
                console.error("Failed to load reels from backend:", e);
                const local = localStorage.getItem('reels') || localStorage.getItem('reelIds');
                setReels(local ? formatData(JSON.parse(local)) : SEED_REELS);
            }
        };
        loadInitial();
    }, []);


    // Extract Video IDs from text
    const extractIds = (text) => {
        const regex = /(?:v=|shorts\/|embed\/|youtu.be\/)([a-zA-Z0-9_-]{11})/g;
        const matches = text.matchAll(regex);
        return [...new Set([...matches].map(m => m[1]))];
    };

    // AI Categorization for bulk links
    const handleBulkUpload = async (text) => {
        const ids = extractIds(text);
        if (ids.length === 0) return alert("No valid YouTube IDs found!");
        
        setIsBulkProcessing(true);
        const groqKey = localStorage.getItem('groqApiKey');
        
        try {
            let processed = [];
            
            if (groqKey) {
                // Prepare AI Prompt for Categorization
                // We ask AI to guess categories based on the fact that this is a USA Bookkeeping/Payroll app
                const aiPrompt = [
                    { role: 'system', content: 'You are a Categorization AI for a USA Accounting/Payroll app. I will give you a list of YouTube Video IDs. Assuming they are about USA Accounting/Payroll/Tax, suggest 2 relevant hashtags for each. Format your response exactly as JSON array: [{"id": "...", "tags": ["#Tag1", "#Tag2"]}, ...]. Only return the JSON.' },
                    { role: 'user', content: `Categorize these IDs: ${ids.join(', ')}` }
                ];

                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: aiPrompt, temperature: 0.5, response_format: { type: "json_object" } })
                });
                
                const aiData = await res.json();
                // Llama 3 on Groq sometimes returns the JSON inside a block or as the content string
                const content = aiData.choices[0].message.content;
                const parsed = JSON.parse(content);
                processed = Array.isArray(parsed) ? parsed : (parsed.reels || parsed.data || []);
            }

            // Combine with defaults for missing ones or if AI failed
            const finalReels = ids.map(id => {
                const found = processed.find(p => p.id === id);
                return {
                    id,
                    tags: found ? found.tags : ["#USA_ACCOUNTING", "#PRO_TIPS"]
                };
            });

            // Save to Backend
            const saveRes = await fetch(`${API_BASE}/reels/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalReels)
            });
            
            if (saveRes.ok) {
                const { added } = await saveRes.json();
                setReels(prev => {
                    const combined = [...prev, ...finalReels];
                    const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                    localStorage.setItem('reels', JSON.stringify(unique));
                    return unique;
                });
                setIsUploadOpen(false);
                alert(`Successfully imported ${finalReels.length} reels!`);
            }
        } catch (e) {
            console.error("Bulk upload failed:", e);
            alert("Error processing links. Check console.");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // ── Ultra-Robust Fetch Logic (for auto-discovery) ──────────────────────
    const fetchShortsBatch = useCallback(async (append = true) => {
        if (fetchStatus === 'loading') return;
        setFetchStatus('loading');

        const groqKey = localStorage.getItem('groqApiKey');
        let selectedQuery = "";

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
            } catch (e) { console.warn("AI query generation failed:", e); }
        }

        if (!selectedQuery) {
            selectedQuery = QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
        }

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
                const vidMatches = html.matchAll(/(?:videoId|v=|embed\/|shorts\/)["\\:?]*([a-zA-Z0-9_-]{11})/g);
                const ids = [...new Set([...vidMatches].map(m => m[1]))];
                if (ids.length > 3) {
                    foundIds = ids.slice(0, 15);
                    break;
                }
            } catch (e) { console.warn(`Proxy ${proxyUrl} failed:`, e); }
        }

        if (foundIds.length > 0) {
            const newReels = foundIds.map(id => ({ id, tags: ["#DISCOVERED", "#USA_TAX"] }));
            setReels(prev => {
                const combined = append ? [...prev, ...newReels] : [...newReels, ...SEED_REELS];
                const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                localStorage.setItem('reels', JSON.stringify(unique));
                return unique;
            });
            setFetchStatus('done');
            setTimeout(() => setFetchStatus('idle'), 2000);
        } else {
            setFetchStatus('error');
            setTimeout(() => setFetchStatus('idle'), 2000);
        }
    }, [fetchStatus]);

    // Nav & Scroll
    const goTo = useCallback((idx) => {
        if (!containerRef.current) return;
        const clamped = Math.max(0, Math.min(idx, reels.length - 1));
        containerRef.current.scrollTo({ top: clamped * containerRef.current.clientHeight, behavior: 'smooth' });
        setActiveIndex(clamped);
    }, [reels.length]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
        if (idx !== activeIndex) setActiveIndex(idx);
        
        if (idx >= reels.length - 3 && fetchStatus === 'idle') {
            fetchShortsBatch(true);
        }
    }, [activeIndex, reels.length, fetchStatus, fetchShortsBatch]);

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
            <BulkUploadModal 
                isOpen={isUploadOpen} 
                onClose={() => setIsUploadOpen(false)} 
                onUpload={handleBulkUpload}
                isProcessing={isBulkProcessing}
            />

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
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 active:scale-90 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                    <button
                        onClick={() => fetchShortsBatch(false)}
                        disabled={fetchStatus === 'loading'}
                        className="p-3 bg-pink-600/20 backdrop-blur-md rounded-full border border-pink-500/40 active:rotate-180 transition-all"
                    >
                        <RefreshCcw size={20} className={fetchStatus === 'loading' ? 'animate-spin' : ''} />
                    </button>
                </div>
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
                {reels.map((reel, idx) => (
                    <div key={`${reel.id}-${idx}`} className="w-full snap-start snap-always" style={{ height: '100dvh' }}>
                        <ReelSlide reel={reel} idx={idx} activeIndex={activeIndex} total={reels.length} />
                    </div>
                ))}
            </div>

            {/* AI Magic Float Button */}
            <div className="absolute right-4 bottom-24 z-50 pointer-events-auto">
                 <button 
                    onClick={() => fetchShortsBatch(true)}
                    className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-pink-500/40 border-2 border-white/20 animate-bounce active:scale-95"
                 >
                    <Sparkles size={24} className="text-white" fill="currentColor" />
                 </button>
            </div>

            {/* Nav indicators */}
            <div className="absolute right-4 bottom-1/2 translate-y-1/2 flex flex-col gap-4 z-40 pointer-events-auto">
                 <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 disabled:opacity-20"><ChevronUp size={24}/></button>
                 <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex >= reels.length - 1} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 disabled:opacity-20"><ChevronDown size={24}/></button>
            </div>
        </div>
    );
}

