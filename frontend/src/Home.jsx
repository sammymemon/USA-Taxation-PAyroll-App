import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronDown, ChevronUp, Shuffle, Maximize2, Minimize2, Bookmark, CheckCircle, Settings, Volume2, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

function Home() {
    const [data, setData] = useState({ categories: [], questions: [] });
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('all');
    const [activeCategory, setActiveCategory] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});
    const [bookmarks, setBookmarks] = useState({});
    const [viewed, setViewed] = useState({});
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        fetchData();
        try {
            setBookmarks(JSON.parse(localStorage.getItem('bookmarks')) || {});
            setViewed(JSON.parse(localStorage.getItem('viewed')) || {});
        } catch (e) { }
    }, []);

    const fetchData = () => {
        axios.get('/api/data')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch QA data:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const stopAudio = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setPlayingId(null);
        }
    };

    const playAudio = (id, text, e) => {
        e.stopPropagation();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop playing any current audio

            // Clean up text (remove HTML tags like <b>, <br>)
            const plainText = text.replace(/<[^>]+>/g, ' ');
            const utterance = new SpeechSynthesisUtterance(plainText);

            utterance.onend = () => setPlayingId(null);
            utterance.onerror = () => setPlayingId(null);

            setPlayingId(id);
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Audio playback is not supported in your browser.");
        }
    };

    const saveBookmarks = (newBookmarks) => {
        setBookmarks(newBookmarks);
        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
    };

    const saveViewed = (newViewed) => {
        setViewed(newViewed);
        localStorage.setItem('viewed', JSON.stringify(newViewed));
    };

    const toggleBookmark = (e, id) => {
        e.stopPropagation();
        const next = { ...bookmarks, [id]: !bookmarks[id] };
        saveBookmarks(next);
    };

    const toggleCard = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
        if (!viewed[id]) {
            const next = { ...viewed, [id]: true };
            saveViewed(next);
        }
    };

    const expandAll = () => {
        const all = {};
        data.questions.forEach(q => all[q.id] = true);
        setExpandedCards(all);
    };

    const collapseAll = () => setExpandedCards({});

    const shuffleSelected = () => {
        const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
        setData({ ...data, questions: shuffled });
    };

    const filteredQuestions = useMemo(() => {
        return data.questions.filter(q => {
            const matchSearch = q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase());
            const matchDiff = difficulty === 'all' || q.diff === difficulty;
            const matchCat = activeCategory === null || q.cat === activeCategory;
            return matchSearch && matchDiff && matchCat;
        });
    }, [data.questions, search, difficulty, activeCategory]);

    if (loading) return <div className="text-center p-20 text-muted">Loading Application Data...</div>;

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            <div className="bg-surface border-b border-border p-6 md:px-10 sticky top-0 z-50 backdrop-blur-md pb-4 flex flex-col gap-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="title-block">
                        <h1 className="font-playfair text-2xl md:text-3xl font-black text-accent tracking-tight leading-tight">
                            📊 USA Payroll & Accounting
                        </h1>
                        <div className="font-plex text-[11px] text-muted mt-1 tracking-widest uppercase">
                            500 INTERVIEW Q&A · KPO EDITION · INDIA → USA
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <div className="bg-tag-bg border border-border rounded-md px-3 py-1 font-plex text-[11px] text-muted">
                            Total: <span className="text-accent font-semibold text-[13px]">{data.questions.length}</span>
                        </div>
                        <div className="bg-tag-bg border border-border rounded-md px-3 py-1 font-plex text-[11px] text-muted hidden sm:block">
                            Viewed: <span className="text-accent font-semibold text-[13px]">{Object.values(viewed).filter(Boolean).length}</span>
                        </div>
                        <Link to="/admin" className="p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent">
                            <Settings size={18} />
                        </Link>
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                        <input
                            type="text"
                            placeholder="Search questions, keywords, forms..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface2 border border-border rounded-lg py-2 pl-9 pr-3 text-text font-plex text-[13px] outline-none transition-colors focus:border-accent placeholder:text-muted"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'basic', 'intermediate', 'advanced'].map(level => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`font-plex text-[11px] px-3 py-1 rounded-full border transition-all whitespace-nowrap capitalize ${difficulty === level ? 'bg-accent border-accent text-[#0f0e0d] font-semibold' : 'bg-tag-bg border-border text-muted hover:border-accent hover:text-accent'}`}
                            >
                                {level === 'all' ? 'All Levels' : level}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-[1300px] mx-auto p-5 md:p-8 grid md:grid-cols-[240px_1fr] gap-8">
                <aside className="md:sticky md:top-40 self-start">
                    <div className="mb-6">
                        <div className="font-plex text-[10px] tracking-widest text-muted uppercase mb-3">Categories</div>
                        <div
                            className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer transition-colors mb-1 border border-transparent ${activeCategory === null ? 'bg-surface2 border-border' : 'hover:bg-surface2'}`}
                            onClick={() => setActiveCategory(null)}
                        >
                            <span className="font-plex text-xs text-text">All Categories</span>
                            <span className="font-plex text-[10px] text-muted bg-tag-bg px-2 rounded-full">{data.questions.length}</span>
                        </div>
                        {data.categories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer transition-colors mb-1 border border-transparent ${activeCategory === cat.id ? 'bg-surface2 border-border' : 'hover:bg-surface2'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${cat.color}`}></div>
                                    <span className="font-plex text-xs text-text">{cat.short}</span>
                                </div>
                                <span className="font-plex text-[10px] text-muted bg-tag-bg px-2 rounded-full">{cat.count}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mb-6">
                        <div className="font-plex text-[10px] tracking-widest text-muted uppercase mb-3">Quick Actions</div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2 mb-1" onClick={expandAll}>
                            <Maximize2 size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Expand All</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2 mb-1" onClick={collapseAll}>
                            <Minimize2 size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Collapse All</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2" onClick={shuffleSelected}>
                            <Shuffle size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Shuffle Mode</span>
                        </div>
                    </div>
                </aside>

                <div className="min-w-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="font-plex text-[10px] text-muted uppercase tracking-widest mb-2">Total</div>
                            <div className="font-playfair text-3xl font-black text-accent">{data.questions.length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="font-plex text-[10px] text-muted uppercase tracking-widest mb-2">Bookmarked</div>
                            <div className="font-playfair text-3xl font-black text-accent">{Object.values(bookmarks).filter(Boolean).length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="font-plex text-[10px] text-muted uppercase tracking-widest mb-2">Viewed</div>
                            <div className="font-playfair text-3xl font-black text-accent">{Object.values(viewed).filter(Boolean).length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="font-plex text-[10px] text-muted uppercase tracking-widest mb-2">Showing</div>
                            <div className="font-playfair text-3xl font-black text-accent">{filteredQuestions.length}</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
                        <h2 className="font-playfair text-2xl font-bold text-text">
                            {activeCategory ? data.categories.find(c => c.id === activeCategory)?.name : 'All Questions'}
                        </h2>
                        <div className="font-plex text-[11px] text-muted">Click to expand answers</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {filteredQuestions.length === 0 ? (
                            <div className="text-center py-16 font-plex text-[13px] text-muted">🔍 No questions found. Try a different search.</div>
                        ) : (
                            filteredQuestions.map((q) => {
                                const isExpanded = expandedCards[q.id];
                                const catInfo = data.categories.find(c => c.id === q.cat) || data.categories[0];
                                return (
                                    <div key={q.id} className={`bg-surface border rounded-xl overflow-hidden transition-colors ${isExpanded ? 'border-[#3e3c38]' : 'border-border hover:border-[#3e3c38]'}`}>
                                        <div className="flex items-start gap-3 p-4 md:px-5 cursor-pointer select-none relative" onClick={() => toggleCard(q.id)}>
                                            <div className="font-plex text-[11px] text-muted min-w-[36px] mt-[2px]">Q{q.id}.</div>
                                            <div className="font-serif text-[14px] leading-relaxed text-text flex-1 pr-16 md:pr-10">
                                                {q.q}
                                            </div>
                                            <div className="absolute right-4 top-4 flex items-center gap-2 bg-surface pl-2 md:pl-0">
                                                <span className={`font-plex text-[10px] px-2 py-[2px] rounded-full border ${catInfo?.tag} hidden md:inline-block`}>
                                                    {catInfo?.short}
                                                </span>
                                                <div onClick={(e) => toggleBookmark(e, q.id)} title="Bookmark" className={`hover:scale-110 transition-transform ${bookmarks[q.id] ? 'text-accent' : 'text-muted hover:text-white'}`}>
                                                    <Bookmark size={15} fill={bookmarks[q.id] ? "currentColor" : "none"} />
                                                </div>
                                                {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="px-5 md:pl-[68px] md:pr-5 pb-4 pt-3 font-serif text-[13.5px] leading-relaxed text-[#c4bfb6] border-t border-border">

                                                <div className="flex justify-end mb-4">
                                                    {playingId === q.id ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                                            className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors font-plex"
                                                        >
                                                            <Square size={12} fill="currentColor" /> Stop Reading
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => playAudio(q.id, q.a, e)}
                                                            className="flex items-center gap-1.5 text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent/20 transition-colors font-plex"
                                                        >
                                                            <Volume2 size={14} /> Read Answer
                                                        </button>
                                                    )}
                                                </div>

                                                <div dangerouslySetInnerHTML={{ __html: q.a }}></div>
                                                {viewed[q.id] && (
                                                    <div className="flex items-center gap-1 mt-3 font-plex text-[10px] text-accent4">
                                                        <CheckCircle size={12} /> Viewed
                                                    </div>
                                                )}
                                                {q.highlight && (
                                                    <div className="bg-[#e8c547]/5 border-l-2 border-accent p-3 rounded-r-md my-3 font-plex text-[12px] text-accent">
                                                        {q.highlight}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
