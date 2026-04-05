import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cloud, CloudOff, Loader2, LogIn, UserPlus, LogOut, CheckCircle, RefreshCw } from 'lucide-react';

export default function SyncAuth({ onSyncComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const savedEmail = localStorage.getItem('authEmail');
        if (token && savedEmail) {
            setUser({ email: savedEmail, token });
            // Auto sync in background on load
            syncData(token, true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const res = await axios.post(endpoint, { email, password });
            
            const { token, email: resEmail, syncData: cloudData } = res.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('authEmail', resEmail);
            setUser({ email: resEmail, token });
            
            // Merge cloud data with local data
            mergeAndSaveData(cloudData);
            
            // Push immediately
            await pushData(token);
            
            setIsOpen(false);
            if (onSyncComplete) onSyncComplete();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Authentication failed");
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authEmail');
        setUser(null);
        setIsOpen(false);
    };

    const mergeAndSaveData = (cloudData) => {
        if (!cloudData) return;
        
        const mergeObj = (localKey, cloudObj) => {
            let localObj = {};
            try { localObj = JSON.parse(localStorage.getItem(localKey)) || {}; } catch(e){}
            const merged = { ...localObj, ...(cloudObj || {}) };
            localStorage.setItem(localKey, JSON.stringify(merged));
        };

        if (cloudData.bookmarks) mergeObj('bookmarks', cloudData.bookmarks);
        if (cloudData.viewed) mergeObj('viewed', cloudData.viewed);
        if (cloudData.mastered) mergeObj('mastered', cloudData.mastered);
        
        if (cloudData.journalTopicIndex !== undefined) {
            const localTopic = parseInt(localStorage.getItem('journalTopicIndex')) || 0;
            localStorage.setItem('journalTopicIndex', Math.max(localTopic, cloudData.journalTopicIndex));
        }
        
        if (cloudData.studyHistory) mergeObj('studyHistory', cloudData.studyHistory);
    };

    const pushData = async (token) => {
        try {
            const getLocal = (key) => {
                try { return JSON.parse(localStorage.getItem(key)) || {}; }
                catch(e) { return {}; }
            };
            const syncPayload = {
                bookmarks: getLocal('bookmarks'),
                viewed: getLocal('viewed'),
                mastered: getLocal('mastered'),
                studyHistory: getLocal('studyHistory'),
                journalTopicIndex: parseInt(localStorage.getItem('journalTopicIndex')) || 0
            };
            
            await axios.post('/api/auth/sync', { syncData: syncPayload }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Warning: Background push failed", err);
        }
    };

    const syncData = async (tokenToUse = user?.token, quiet = false) => {
        if (!tokenToUse) return;
        if (!quiet) setLoading(true);
        try {
            // First push local updates
            await pushData(tokenToUse);
            
            // Then pull latest (in case other devices updated)
            const res = await axios.get('/api/auth/sync', {
                headers: { Authorization: `Bearer ${tokenToUse}` }
            });
            mergeAndSaveData(res.data.syncData);
            
            if (onSyncComplete) onSyncComplete();
        } catch (err) {
            console.error("Sync failed", err);
            if (!quiet) setError("Sync failed");
        }
        if (!quiet) setLoading(false);
    };

    return (
        <>
            <button 
                onClick={() => user ? syncData() : setIsOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm font-plex transition-all border ${user ? 'bg-green-500/10 text-green-500 border-green-500/30 shadow-sm' : 'bg-surface text-text border-border hover:bg-surface2 shadow-sm'}`}
            >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : user ? <Cloud size={16} /> : <CloudOff size={16} />}
                <span className="hidden sm:inline">{user ? "Synced" : "Sign in to Sync"}</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg border border-border/80 w-full max-w-sm rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
                        >
                            <LogOut size={20} className="rotate-180" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
                                <Cloud className="text-accent" size={32} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-playfair font-bold text-text mb-1">
                                {user ? 'Your Account' : (isLogin ? 'Welcome Back' : 'Create Account')}
                            </h2>
                            <p className="text-xs font-plex text-muted">
                                {user ? 'Manage your sync settings' : 'Sync your progress across mobile & laptop'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-plex text-center">
                                {error}
                            </div>
                        )}

                        {user ? (
                            <div className="space-y-4">
                                <div className="bg-surface p-4 rounded-2xl border border-border text-center">
                                    <p className="text-xs text-muted mb-1 font-plex uppercase tracking-widest">Logged in as</p>
                                    <p className="font-bold text-text truncate font-serif">{user.email}</p>
                                </div>
                                <button 
                                    onClick={() => syncData()}
                                    disabled={loading}
                                    className="w-full py-3 bg-accent text-bg font-bold font-plex text-sm rounded-xl hover:bg-accent/90 transition-all flex justify-center items-center gap-2 shadow-md"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
                                    Force Sync Now
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    className="w-full py-3 bg-surface border border-border text-red-500 font-bold font-plex text-sm rounded-xl hover:bg-red-500/10 transition-all flex justify-center items-center gap-2"
                                >
                                    <LogOut size={16} /> Logout & Stop Sync
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-plex text-muted font-bold tracking-widest ml-1 mb-1 block">Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-surface border border-border px-4 py-3 rounded-xl text-sm font-plex text-text focus:border-accent outline-none"
                                        placeholder="you@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-plex text-muted font-bold tracking-widest ml-1 mb-1 block">Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-surface border border-border px-4 py-3 rounded-xl text-sm font-plex text-text focus:border-accent outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3.5 bg-accent text-bg font-bold font-plex text-sm rounded-xl hover:bg-accent/90 transition-all flex justify-center items-center gap-2 shadow-md mt-6"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? <LogIn size={18} /> : <UserPlus size={18} />)}
                                    {isLogin ? 'Sign In & Sync' : 'Create Account & Sync'}
                                </button>
                                <div className="text-center mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsLogin(!isLogin)}
                                        className="text-xs font-plex text-muted hover:text-accent transition-colors"
                                    >
                                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
