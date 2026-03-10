import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronDown, ChevronUp, Shuffle, Maximize2, Minimize2, Bookmark, CheckCircle, Settings, Volume2, Square, Menu, X, Clock, Play, Pause, BarChart2 } from 'lucide-react';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [practiceTime, setPracticeTime] = useState(0);
    const [textSize, setTextSize] = useState('medium');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [studyHistory, setStudyHistory] = useState({});

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        let history = {};
        try { history = JSON.parse(localStorage.getItem('studyHistory')) || {}; } catch (e) { }

        // Migrate old time if exists
        const oldTimer = localStorage.getItem('practiceTime');
        const oldDate = localStorage.getItem('practiceDate');
        if (oldTimer && oldDate) {
            const oldDateFormatted = new Date(oldDate).toISOString().split('T')[0];
            if (!history[oldDateFormatted]) {
                history[oldDateFormatted] = parseInt(oldTimer, 10) || 0;
            }
            localStorage.removeItem('practiceTime');
            localStorage.removeItem('practiceDate');
        }

        if (!history[today]) {
            history[today] = 0;
        }

        localStorage.setItem('studyHistory', JSON.stringify(history));
        setPracticeTime(history[today]);
        setStudyHistory(history);

        const storedTextSize = localStorage.getItem('textSize');
        if (storedTextSize) {
            setTextSize(storedTextSize);
        }
    }, []);

    useEffect(() => {
        let interval;
        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(interval);
            } else {
                startTimer();
            }
        };

        const startTimer = () => {
            clearInterval(interval);
            interval = setInterval(() => {
                setPracticeTime(prev => {
                    const newTime = prev + 1;
                    const today = new Date().toISOString().split('T')[0];
                    setStudyHistory(curr => {
                        const updated = { ...curr, [today]: newTime };
                        localStorage.setItem('studyHistory', JSON.stringify(updated));
                        return updated;
                    });
                    return newTime;
                });
            }, 1000);
        };

        if (!document.hidden) {
            startTimer();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    const handleTextSizeChange = (size) => {
        setTextSize(size);
        localStorage.setItem('textSize', size);
    };

    const getTextSizeClass = () => {
        switch (textSize) {
            case 'small': return 'text-[12px] md:text-[13px] leading-relaxed';
            case 'large': return 'text-[16px] md:text-[18px] leading-relaxed';
            case 'medium':
            default: return 'text-[13.5px] md:text-[15px] leading-relaxed';
        }
    };

    useEffect(() => {
        // Fetch local static data first for instant load
        axios.get('/data.json')
            .then(res => {
                setData(prev => prev.questions && prev.questions.length > 0 ? prev : res.data);
                setLoading(false);
            })
            .catch(console.error);

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
                console.error("Failed to fetch QA data from backend:", err);
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
                        <div className="bg-tag-bg border border-border rounded-md px-3 py-1 flex items-center gap-2 font-plex text-[11px] text-muted cursor-pointer hover:bg-surface2 transition-colors" onClick={() => setShowStatsModal(true)} title="View Time Tracking Stats">
                            <div className="flex items-center gap-1.5 justify-center">
                                <Clock size={12} className={practiceTime >= 3600 ? "text-green-500" : "text-accent"} />
                                <span className={practiceTime >= 3600 ? "text-green-500 font-semibold text-[13px]" : "text-accent font-semibold text-[13px]"}>
                                    {formatTime(practiceTime)}
                                </span>
                            </div>
                            <BarChart2 size={14} className="text-muted" />
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent">
                            <Menu size={18} />
                        </button>
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
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-[#0f0e0d]/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <aside className={`fixed md:sticky top-0 md:top-40 left-0 h-[100dvh] md:h-auto bg-surface md:bg-transparent z-50 md:z-auto w-[280px] md:w-auto p-6 md:p-0 overflow-y-auto md:overflow-visible transition-transform duration-300 border-r border-border md:border-none shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} self-start flex flex-col`}>
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <span className="font-plex text-[11px] tracking-widest text-muted uppercase">Filters & Actions</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-muted p-1 hover:text-accent rounded-md bg-surface2">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <div className="font-plex text-[10px] tracking-widest text-muted uppercase mb-3">Categories</div>
                        <div
                            className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer transition-colors mb-1 border border-transparent ${activeCategory === null ? 'bg-surface2 border-border' : 'hover:bg-surface2'}`}
                            onClick={() => { setActiveCategory(null); setIsSidebarOpen(false); }}
                        >
                            <span className="font-plex text-xs text-text">All Categories</span>
                            <span className="font-plex text-[10px] text-muted bg-tag-bg px-2 rounded-full">{data.questions.length}</span>
                        </div>
                        {data.categories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setIsSidebarOpen(false); }}
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
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2 mb-1" onClick={() => { expandAll(); setIsSidebarOpen(false); }}>
                            <Maximize2 size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Expand All</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2 mb-1" onClick={() => { collapseAll(); setIsSidebarOpen(false); }}>
                            <Minimize2 size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Collapse All</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-surface2" onClick={() => { shuffleSelected(); setIsSidebarOpen(false); }}>
                            <Shuffle size={14} className="text-muted" /> <span className="font-plex text-xs text-text">Shuffle Mode</span>
                        </div>
                    </div>
                </aside>

                <div className="min-w-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-6 md:mb-8">
                        <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                            <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Total</div>
                            <div className="font-playfair text-xl md:text-3xl font-black text-accent">{data.questions.length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                            <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Bookmarked</div>
                            <div className="font-playfair text-xl md:text-3xl font-black text-accent">{Object.values(bookmarks).filter(Boolean).length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                            <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Viewed</div>
                            <div className="font-playfair text-xl md:text-3xl font-black text-accent">{Object.values(viewed).filter(Boolean).length}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                            <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Showing</div>
                            <div className="font-playfair text-xl md:text-3xl font-black text-accent">{filteredQuestions.length}</div>
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

                                                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                                    <div className="flex gap-1 bg-surface2 p-1 rounded-lg border border-border">
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('small'); }} className={`px-2 py-1 text-xs font-plex rounded-md transition-colors ${textSize === 'small' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A-</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('medium'); }} className={`px-2 py-1 text-sm font-plex rounded-md transition-colors ${textSize === 'medium' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('large'); }} className={`px-2 py-1 text-base font-plex rounded-md transition-colors ${textSize === 'large' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A+</button>
                                                    </div>
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

                                                <div className={`transition-all duration-300 ${getTextSizeClass()}`} dangerouslySetInnerHTML={{ __html: q.a }}></div>
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
            {showStatsModal && (
                <div className="fixed inset-0 bg-[#0f0e0d]/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowStatsModal(false)}>
                    <div className="bg-surface border border-border rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b border-border bg-surface2/50">
                            <h3 className="font-playfair text-xl font-bold text-text flex items-center gap-2">
                                <BarChart2 size={20} className="text-accent" /> Time Tracking
                            </h3>
                            <button onClick={() => setShowStatsModal(false)} className="text-muted hover:text-white p-1 rounded-md bg-surface transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="font-plex text-xs text-muted uppercase tracking-widest mb-2">Total Time Tracked</div>
                                <div className="font-playfair text-4xl font-black text-accent">
                                    {formatTime(Object.values(studyHistory).reduce((a, b) => a + b, 0))}
                                </div>
                            </div>

                            <h4 className="font-plex text-xs text-muted uppercase tracking-widest mb-3 border-b border-border pb-2">Recent History</h4>
                            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.keys(studyHistory).sort().reverse().slice(0, 7).map(date => {
                                    const time = studyHistory[date];
                                    const maxTime = Math.max(...Object.values(studyHistory), 1);
                                    const percentage = Math.min((time / maxTime) * 100, 100);

                                    return (
                                        <div key={date} className="flex flex-col gap-1 text-sm bg-surface2/30 p-2 rounded-md border border-border/50">
                                            <div className="flex justify-between font-plex">
                                                <span className="text-text">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                <span className="text-accent font-semibold">{formatTime(time)}</span>
                                            </div>
                                            <div className="w-full bg-bg h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-accent h-full transition-all duration-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;
