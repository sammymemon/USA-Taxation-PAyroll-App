import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronDown, ChevronUp, Shuffle, Maximize2, Minimize2, Bookmark, CheckCircle, Settings, Volume2, Square, Menu, X, Clock, Play, Pause, BarChart2, Sun, Moon, ChevronLeft, ChevronRight, RotateCcw, Mic, BookOpen, Video, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import SyncAuth from './SyncAuth';

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
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [studyHistory, setStudyHistory] = useState({});
    const [mastered, setMastered] = useState({});
    const [hideMastered, setHideMastered] = useState(() => {
        const saved = localStorage.getItem('hideMasteredSetting');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem('voiceSpeed')) || 1);

    // Flashcard View State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

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
            case 'small': return 'text-[14px] md:text-[15px] leading-relaxed';
            case 'large': return 'text-[18px] md:text-[20px] leading-relaxed';
            case 'medium':
            default: return 'text-[16px] md:text-[17px] leading-relaxed';
        }
    };

    const getQuestionTextSizeClass = () => {
        switch (textSize) {
            case 'small': return 'text-[15px] md:text-[16px] leading-relaxed';
            case 'large': return 'text-[20px] md:text-[22px] leading-relaxed';
            case 'medium':
            default: return 'text-[17px] md:text-[18px] leading-relaxed';
        }
    };

    useEffect(() => {
        // Fetch local static data first for instant load
        fetch('/data.json')
            .then(res => res.json())
            .then(fetchedData => {
                setData(prev => prev.questions && prev.questions.length > 0 ? prev : fetchedData);
                setLoading(false);
            })
            .catch(console.error);

        fetchData();
        loadLocalStates();
    }, []);

    const loadLocalStates = () => {
        try {
            setBookmarks(JSON.parse(localStorage.getItem('bookmarks')) || {});
            setViewed(JSON.parse(localStorage.getItem('viewed')) || {});
            setMastered(JSON.parse(localStorage.getItem('mastered')) || {});
            
            const today = new Date().toISOString().split('T')[0];
            let history = {};
            try { history = JSON.parse(localStorage.getItem('studyHistory')) || {}; } catch(e){}
            setPracticeTime(history[today] || 0);
        } catch (e) { }
    };

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
        if ('speechSynthesis' in window) {
            const loadVoices = () => window.speechSynthesis.getVoices();
            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
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

    const playIndianAudio = (id, text, e) => {
        if (e) e.stopPropagation();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            const plainText = text.replace(/<[^>]+>/g, ' ');
            const utterance = new SpeechSynthesisUtterance(plainText);

            const voices = window.speechSynthesis.getVoices();
            const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india'));

            if (indianVoice) {
                utterance.voice = indianVoice;
            } else {
                utterance.lang = 'en-IN';
            }

            utterance.rate = voiceSpeed;
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
        if(e) e.stopPropagation();
        const next = { ...bookmarks, [id]: !bookmarks[id] };
        saveBookmarks(next);
    };

    const saveMastered = (newMastered) => {
        setMastered(newMastered);
        localStorage.setItem('mastered', JSON.stringify(newMastered));
    };

    const toggleMastered = (e, id) => {
        if(e) e.stopPropagation();
        const next = { ...mastered, [id]: !mastered[id] };
        saveMastered(next);
    };

    const handleVoiceSpeedChange = (e) => {
        if(e) e.stopPropagation();
        const newSpeed = parseFloat(e.target.value);
        setVoiceSpeed(newSpeed);
        localStorage.setItem('voiceSpeed', newSpeed);
        stopAudio();
    };

    const toggleHideMastered = () => {
        const next = !hideMastered;
        setHideMastered(next);
        localStorage.setItem('hideMasteredSetting', JSON.stringify(next));
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
            const matchMastered = hideMastered ? !mastered[q.id] : true;
            return matchSearch && matchDiff && matchCat && matchMastered;
        });
    }, [data.questions, search, difficulty, activeCategory, hideMastered, mastered]);

    // Reset index and flip status when filters change
    useEffect(() => {
        if (currentIndex >= filteredQuestions.length) {
            setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
        }
        setIsFlipped(false);
        stopAudio();
    }, [search, difficulty, activeCategory, hideMastered, filteredQuestions.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowRight':
                    if (currentIndex < filteredQuestions.length - 1) {
                        setCurrentIndex(prev => prev + 1);
                        setIsFlipped(false);
                        stopAudio();
                    }
                    break;
                case 'ArrowLeft':
                    if (currentIndex > 0) {
                        setCurrentIndex(prev => prev - 1);
                        setIsFlipped(false);
                        stopAudio();
                    }
                    break;
                case ' ': // Spacebar
                    e.preventDefault();
                    setIsFlipped(prev => {
                        const nextFlipped = !prev;
                        const currentQ = filteredQuestions[currentIndex];
                        if (currentQ && !viewed[currentQ.id]) {
                            saveViewed({ ...viewed, [currentQ.id]: true });
                        }
                        return nextFlipped;
                    });
                    break;
                case 's':
                case 'S':
                    {
                        const currentQ = filteredQuestions[currentIndex];
                        if (currentQ) {
                            playIndianAudio(currentQ.id, isFlipped ? currentQ.a : currentQ.q);
                        }
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, filteredQuestions, isFlipped, viewed]);

    const handleNext = () => {
        if (currentIndex < filteredQuestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            stopAudio();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
            stopAudio();
        }
    };

    const toggleFlip = () => {
        setIsFlipped(prev => !prev);
        const currentQ = filteredQuestions[currentIndex];
        if (currentQ && !viewed[currentQ.id]) {
            const next = { ...viewed, [currentQ.id]: true };
            saveViewed(next);
        }
    };

    // Non-blocking return - render immediately
    // if (loading) return ... removed for instant load


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
                        <button onClick={toggleTheme} className="p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent" title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <SyncAuth onSyncComplete={loadLocalStates} />
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent shrink-0">
                            <Menu size={18} />
                        </button>
                        <Link to="/interview" className="px-3 py-1.5 bg-accent text-[#0f0e0d] font-semibold rounded-md hover:opacity-90 transition-colors text-[13px] flex items-center gap-1.5 shadow-md shrink-0 focus:ring-2 ring-offset-2 ring-accent outline-none">
                            <Mic size={16} /> <span className="hidden sm:inline">Interview Mode</span>
                        </Link>
                        <Link to="/journal" className="px-3 py-1.5 bg-[#4ade80] text-[#0f0e0d] font-semibold rounded-md hover:opacity-90 transition-colors text-[13px] flex items-center gap-1.5 shadow-md shrink-0 focus:ring-2 ring-offset-2 ring-[#4ade80] outline-none">
                            <BookOpen size={16} /> <span className="hidden sm:inline">Journal Mode</span>
                        </Link>
                        <Link to="/reels" className="px-3 py-1.5 bg-pink-500 text-white font-semibold rounded-md hover:opacity-90 transition-colors text-[13px] flex items-center gap-1.5 shadow-md shrink-0 focus:ring-2 ring-offset-2 ring-pink-500 outline-none">
                            <Video size={16} fill="currentColor" /> <span className="hidden sm:inline">Shorts</span>
                        </Link>
                        <Link to="/checklist" className="px-3 py-1.5 bg-blue-500 text-white font-semibold rounded-md hover:opacity-90 transition-colors text-[13px] flex items-center gap-1.5 shadow-md shrink-0 focus:ring-2 ring-offset-2 ring-blue-500 outline-none">
                            <ListTodo size={16} /> <span className="hidden sm:inline">Checklist</span>
                        </Link>
                        <Link to="/admin" className="p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent shrink-0">
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
                        <button
                            onClick={toggleHideMastered}
                            className={`font-plex text-[11px] px-3 py-1 rounded-full border transition-all whitespace-nowrap ${hideMastered ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-tag-bg border-border text-muted hover:border-accent hover:text-accent'}`}
                        >
                            {hideMastered ? 'Showing: Unmastered Only' : 'Showing: All Cards'}
                        </button>
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

                    <div className="min-w-0 flex-1 w-full max-w-4xl mx-auto">
                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between font-plex text-[11px] text-muted mb-2 tracking-widest uppercase">
                                <span>Progress</span>
                                <span>{filteredQuestions.length > 0 ? currentIndex + 1 : 0} / {filteredQuestions.length} Cards</span>
                            </div>
                            <div className="w-full bg-surface2 h-2 rounded-full overflow-hidden border border-border">
                                <div 
                                    className="h-full bg-accent transition-all duration-300 ease-out" 
                                    style={{ width: `${filteredQuestions.length > 0 ? ((currentIndex + 1) / filteredQuestions.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-6 md:mb-8">
                            <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                                <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Total</div>
                                <div className="font-playfair text-xl md:text-3xl font-black text-accent">{data.questions.length}</div>
                            </div>
                            <div className="bg-surface border border-border rounded-lg p-2 md:p-4">
                                <div className="font-plex text-[9px] md:text-[10px] text-muted uppercase tracking-widest mb-1 md:mb-2">Mastered</div>
                                <div className="font-playfair text-xl md:text-3xl font-black text-accent">{Object.values(mastered).filter(Boolean).length}</div>
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
                    </div>

                    <div className="max-w-3xl mx-auto flex flex-col gap-6">
                        {filteredQuestions.length === 0 ? (
                            <div className="text-center py-16 font-plex text-[13px] text-muted">🔍 No questions found. Try a different search.</div>
                        ) : (
                            (() => {
                                const q = filteredQuestions[currentIndex];
                                const catInfo = data.categories.find(c => c.id === q.cat) || data.categories[0];
                                return (
                                    <div className="flex flex-col items-center gap-6">
                                        {/* Flashcard Component */}
                                        {/* Flashcard Component */}
                                        <div className={`bg-surface border rounded-3xl overflow-hidden transition-all duration-300 relative flex flex-col w-full min-h-[400px] md:min-h-[450px] ${isFlipped ? 'border-accent shadow-xl shadow-accent/5' : 'border-border shadow-lg'}`}>

                                            {/* Header Actions */}
                                            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-border bg-surface2/40">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-plex text-[12px] md:text-[13px] text-muted tracking-widest uppercase font-semibold">
                                                        {isFlipped ? 'Answer' : 'Question'} {q.id}
                                                    </span>
                                                    {playingId === q.id && (
                                                        <span className="flex items-center gap-1 text-[11px] text-accent font-plex font-bold ml-1 animate-pulse border border-accent/30 bg-accent/10 px-2 py-0.5 rounded-full">
                                                            <Volume2 size={12} /> Playing Audio
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-plex text-[11px] px-3 py-0.5 rounded-full border ${catInfo?.tag} hidden sm:inline-block uppercase tracking-wider`}>
                                                        {catInfo?.name}
                                                    </span>
                                                    <div onClick={(e) => toggleBookmark(e, q.id)} title="Bookmark" className={`cursor-pointer hover:scale-110 transition-transform ${bookmarks[q.id] ? 'text-accent' : 'text-muted hover:text-text'}`}>
                                                        <Bookmark size={20} fill={bookmarks[q.id] ? "currentColor" : "none"} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Content area */}
                                            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center items-center relative overflow-y-auto custom-scrollbar">

                                                {!isFlipped ? (
                                                    <div className="flex flex-col items-center justify-center text-center w-full h-full animate-fadeIn">
                                                        <div className="flex flex-col items-center justify-center flex-1 w-full">
                                                            <div className="flex gap-4 items-center mb-5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); playIndianAudio(q.id, q.q, e); }}
                                                                    className="p-3.5 bg-surface2 border border-border rounded-full text-accent hover:bg-accent hover:text-[#0f0e0d] transition-all hover:scale-105 shadow-md flex items-center justify-center"
                                                                    title="Play Audio"
                                                                >
                                                                    <Volume2 size={24} />
                                                                </button>
                                                                {playingId === q.id && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                                                        className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-105 shadow-md flex items-center justify-center"
                                                                        title="Stop Audio"
                                                                    >
                                                                        <Square size={24} fill="currentColor" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div
                                                                className={`font-serif ${getQuestionTextSizeClass()} text-text hover:text-accent transition-colors font-medium leading-[1.6] px-4 py-4 w-full`}
                                                                onClick={(e) => { e.stopPropagation(); playIndianAudio(q.id, q.q, e); }}
                                                                title="Click to hear question"
                                                            >
                                                                {q.q}
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="mt-6 font-plex text-[14px] md:text-[15px] font-semibold text-text flex items-center gap-2.5 bg-surface2 px-8 py-3.5 rounded-xl border border-border border-b-4 hover:border-b-accent hover:text-accent transition-all shadow-md active:translate-y-[2px] active:border-b-2 w-[80%] md:w-auto justify-center"
                                                            onClick={(e) => { e.stopPropagation(); toggleFlip(); }}
                                                        >
                                                            <RotateCcw size={18} /> Show Answer (Space)
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col w-full h-full animate-fadeIn text-left relative pb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); playIndianAudio(q.id, q.a, e); }}
                                                                        className="p-3 bg-surface2 border border-border rounded-full text-accent hover:bg-accent hover:text-[#0f0e0d] transition-all hover:scale-105 shadow-md shrink-0 flex items-center justify-center"
                                                                        title="Play Audio (S)"
                                                                    >
                                                                        <Volume2 size={20} />
                                                                    </button>
                                                                    {playingId === q.id && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                                                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-105 shadow-md shrink-0 flex items-center justify-center"
                                                                            title="Stop Audio"
                                                                        >
                                                                            <Square size={20} fill="currentColor" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className="font-plex text-[12px] md:text-[13px] text-muted tracking-wide cursor-pointer hover:text-text transition-colors"
                                                                    onClick={(e) => { e.stopPropagation(); playIndianAudio(q.id, q.a, e); }}
                                                                >
                                                                    Listen to Answer (Press S)
                                                                </span>
                                                            </div>

                                                            <div
                                                                className={`font-serif ${getTextSizeClass()} text-text opacity-95 hover:text-accent transition-colors leading-[1.8] rounded-xl px-2 py-2`}
                                                                dangerouslySetInnerHTML={{ __html: q.a }}
                                                                onClick={(e) => { e.stopPropagation(); playIndianAudio(q.id, q.a, e); }}
                                                            >
                                                            </div>
                                                            {q.highlight && (
                                                                <div className="bg-[#e8c547]/5 border-l-4 border-accent p-4 md:p-5 rounded-r-lg mt-6 font-plex text-[13px] md:text-[14px] leading-relaxed text-accent">
                                                                    {q.highlight}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-center mt-10 pt-6 border-t border-border/50">
                                                            <button
                                                                className="font-plex text-[14px] md:text-[15px] font-semibold text-text flex items-center gap-2 bg-surface2 px-8 py-3.5 rounded-xl border border-border border-b-4 hover:border-b-accent hover:text-accent transition-all shadow-md active:translate-y-[2px] active:border-b-2 w-[80%] md:w-auto justify-center"
                                                                onClick={(e) => { e.stopPropagation(); toggleFlip(); }}
                                                            >
                                                                <RotateCcw size={18} /> Back to Question (Space)
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Controls */}
                                            <div className="flex flex-wrap gap-4 justify-between items-center p-4 border border-border bg-surface2/40 rounded-3xl mt-4">
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex gap-1.5 bg-surface p-1 rounded-lg border border-border">
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('small'); }} className={`px-2.5 py-1 text-[11px] font-plex rounded-md transition-colors ${textSize === 'small' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A-</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('medium'); }} className={`px-2.5 py-1 text-[12px] font-plex rounded-md transition-colors ${textSize === 'medium' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleTextSizeChange('large'); }} className={`px-2.5 py-1 text-[13px] font-plex rounded-md transition-colors ${textSize === 'large' ? 'bg-accent text-[#0f0e0d] font-semibold' : 'text-muted hover:text-text'}`}>A+</button>
                                                    </div>

                                                    <div className="flex items-center gap-2 font-plex text-[11px] relative self-center">
                                                        <span className="text-muted hidden sm:inline">Speed:</span>
                                                        <select 
                                                            value={voiceSpeed}
                                                            onChange={handleVoiceSpeedChange}
                                                            className="bg-surface border border-border text-text rounded-md px-2 py-1 outline-none text-[11px] appearance-none cursor-pointer pr-6 hover:border-accent"
                                                        >
                                                            <option value="0.5">0.5x</option>
                                                            <option value="0.75">0.75x</option>
                                                            <option value="1">1.0x</option>
                                                            <option value="1.25">1.25x</option>
                                                            <option value="1.5">1.5x</option>
                                                            <option value="2">2.0x</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                                            <ChevronDown size={12} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 items-center">
                                                    <button 
                                                        onClick={(e) => toggleMastered(e, q.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-plex text-[11px] uppercase tracking-wider font-semibold transition-all ${mastered[q.id] ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-surface border-border text-muted hover:text-green-400 hover:border-green-400/50'}`}
                                                    >
                                                        <CheckCircle size={14} fill={mastered[q.id] ? "currentColor" : "none"}/> 
                                                        {mastered[q.id] ? 'Mastered' : 'Mark Mastered'}
                                                    </button>
                                                    {playingId === q.id && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                                            className="flex items-center gap-1.5 text-[12px] text-red-500 bg-red-500/10 px-4 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors font-plex uppercase tracking-wider font-semibold"
                                                        >
                                                            <Square size={12} fill="currentColor" /> Stop
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                        {/* Pagination Controls */}
                                        <div className="flex items-center justify-between w-full max-w-sm bg-surface border border-border p-2 rounded-2xl shadow-sm">
                                            <button
                                                onClick={handlePrev}
                                                disabled={currentIndex === 0}
                                                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface2 text-text'}`}
                                            >
                                                <ChevronLeft size={24} />
                                            </button>

                                            <div className="flex flex-col items-center">
                                                <span className="font-plex text-[14px] font-semibold text-text">
                                                    {currentIndex + 1} <span className="text-muted font-normal mx-1">/</span> {filteredQuestions.length}
                                                </span>
                                            </div>

                                            <button
                                                onClick={handleNext}
                                                disabled={currentIndex === filteredQuestions.length - 1}
                                                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${currentIndex === filteredQuestions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface2 text-text'}`}
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })()
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
