import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Bot, Mic, Send, Loader2, Sparkles, AlertCircle, RefreshCcw, User, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';

async function callGroq(apiKey, messages, maxTokens = 1000) {
    try {
        const payload = {
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
        };

        const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            payload,
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        return res.data?.choices?.[0]?.message?.content || '';
    } catch (e) {
        console.error('Groq API error:', e?.response?.data || e.message);
        throw e;
    }
}

export default function AIInterview() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('setup'); // setup, interview, finished
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const speak = async (text) => {
        if (!text) return;
        
        // Stop any current speech
        if (window.speechSynthesis.isSpeaking) {
            window.speechSynthesis.cancel();
        }

        // Try StreamElements first (High Quality, Free)
        try {
            setIsSpeaking(true);
            const voice = "Kajal"; // Using Kajal for the AI Interviewer (Clear & Professional)
            const seUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text.substring(0, 500))}`;
            
            const response = await fetch(seUrl);
            if (response.ok) {
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.onended = () => setIsSpeaking(false);
                audio.play();
                return;
            }
        } catch (err) {
            console.warn("StreamElements TTS failed, falling back to browser speech.");
        }

        // Final Fallback: Browser TTS
        fallbackSpeak(text);
    };

    const fallbackSpeak = (text) => {
        if (!('speechSynthesis' in window)) return;
        const plainText = text.replace(/<[^>]+>/g, ' ');
        const utterance = new SpeechSynthesisUtterance(plainText);
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.lang.includes('hi-IN'));
        if (indianVoice) utterance.voice = indianVoice;
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const generateRandomTopic = async () => {
        if (!apiKey) return alert("Please enter Groq API Key first!");
        setIsLoading(true);
        try {
            const prompt = "Suggest one specific and interesting topic for a USA Accounting and Taxation mock interview. Just give the topic name, nothing else. Examples: 'Payroll Tax Liabilities', 'Bank Reconciliation', 'Form 1040 Schedule C'.";
            const suggested = await callGroq(apiKey, [{ role: 'user', content: prompt }], 50);
            setTopic(suggested.replace(/["']/g, '').trim());
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const startInterview = async () => {
        if (!topic.trim()) return alert("Please enter a topic for the interview!");
        if (!apiKey) return alert("Please enter your Groq API Key first!");

        setStatus('interview');
        setIsLoading(true);

        const initialPrompt = {
            role: 'system',
            content: `You are an expert USA Accounting & Taxation Interviewer. 
            Topic: ${topic}
            Language: Hinglish (Hindi + English mix). Use phrases like "Theek hai", "Chalo shuru karte hain", "Explain kijiye".
            
            GOAL: Conduct a professional but friendly mock interview.
            RULES:
            1. Introduce yourself briefly in Hinglish.
            2. Ask exactly ONE technical question at a time.
            3. After the user answers, provide brief feedback (correct/incorrect) and then ask the next question.
            4. Keep the conversation flow natural.
            5. Total 5 questions.
            6. After 5 questions, give a summary of performance and end the interview.`
        };

        try {
            const response = await callGroq(apiKey, [
                initialPrompt,
                { role: 'user', content: `Let's start the interview on ${topic}. Aap shuru kijiye.` }
            ]);
            
            const aiMessage = { role: 'assistant', content: response };
            setMessages([aiMessage]);
            speak(response);
        } catch (err) {
            alert("Error starting interview. Please check your API key.");
            setStatus('setup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const chatHistory = [
                {
                    role: 'system',
                    content: `You are an expert USA Accounting Interviewer. Speak in Hinglish. Be professional.
                    Topic: ${topic}. Ask one question at a time. Total 5 questions. Current count: ${messages.filter(m => m.role === 'assistant').length}.`
                },
                ...messages,
                userMessage
            ];

            const response = await callGroq(apiKey, chatHistory);
            const aiMessage = { role: 'assistant', content: response };
            setMessages(prev => [...prev, aiMessage]);
            speak(response);

            if (response.toLowerCase().includes('interview complete') || response.toLowerCase().includes('shukriya') || messages.length > 10) {
                // Potential end condition
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg text-text font-serif flex flex-col selection:bg-accent/30">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-xl border-b border-border p-5 flex justify-between items-center sticky top-0 z-50 shadow-lg">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-xl hover:bg-surface2 transition-all text-muted hover:text-accent shadow-sm group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="font-playfair text-xl md:text-2xl font-bold text-text flex items-center gap-3">
                            <div className="p-2 bg-accent/20 rounded-xl text-accent animate-pulse">
                                <Mic size={20} />
                            </div>
                            AI Mock Interview
                        </h1>
                        <p className="font-plex text-[10px] text-muted tracking-widest uppercase mt-0.5">Live Hinglish Practice Session</p>
                    </div>
                </div>
                {status === 'interview' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                        <span className="text-[11px] font-plex font-bold text-green-500 uppercase">Live</span>
                    </div>
                )}
            </div>

            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col">
                {status === 'setup' ? (
                    <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
                        <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-[2.5rem] p-10 md:p-16 shadow-2xl text-center w-full relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="w-24 h-24 bg-gradient-to-tr from-accent to-[#e6c239] text-[#0f0e0d] rounded-3xl flex items-center justify-center mx-auto mb-8 border border-accent/20 shadow-2xl transform hover:rotate-12 transition-transform duration-500">
                                <Bot size={48} />
                            </div>
                            
                            <h2 className="text-4xl md:text-5xl font-playfair font-black mb-6 text-white tracking-tight">
                                Tayyar hain <span className="text-accent">Mock Test</span> ke liye?
                            </h2>
                            <p className="text-muted font-plex text-base max-w-xl mx-auto mb-10 leading-relaxed">
                                AI aapse technical accounting sawal puchega. 
                                Aap Hinglish ya English mein jawab de sakte hain. Bilkul real interview wala feel!
                            </p>

                            <div className="max-w-md mx-auto space-y-5 relative z-10">
                                <div className="group relative">
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        placeholder="e.g. Bank Reconciliation, Payroll Taxes..."
                                        className="w-full bg-bg/50 border border-border px-6 py-5 rounded-2xl font-plex text-text outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 shadow-inner transition-all placeholder:text-muted/50 pr-16"
                                    />
                                    <button 
                                        onClick={generateRandomTopic}
                                        disabled={isLoading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl transition-all border border-accent/20 group-hover:scale-110 active:scale-95 disabled:opacity-50"
                                        title="AI Suggest Topic"
                                    >
                                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    </button>
                                </div>

                                <div className="bg-surface/50 border border-border rounded-2xl p-4">
                                    <h5 className="font-plex text-[10px] text-muted font-bold mb-3 uppercase tracking-widest text-left px-2">
                                        Groq API Key (For Logic)
                                    </h5>
                                    <input
                                        type="password"
                                        placeholder="gsk_..."
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            localStorage.setItem('groqApiKey', e.target.value.trim());
                                        }}
                                        className="w-full bg-bg border border-border px-4 py-3 rounded-xl text-sm font-plex outline-none focus:border-accent shadow-sm"
                                    />
                                    <p className="text-[9px] text-muted mt-2 px-2 text-left">Voice engine is powered by StreamElements (Free).</p>
                                </div>

                                <button
                                    onClick={startInterview}
                                    className="w-full bg-accent text-[#0f0e0d] font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent/20 text-lg group"
                                >
                                    Start Interview 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </button>
                            </div>
                            
                            <div className="mt-12 flex flex-wrap gap-2 justify-center opacity-60">
                                {['Accounting Equation', 'Sales Tax', '1099 Setup', 'Form 941'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setTopic(t)}
                                        className="text-[10px] font-plex font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-500">
                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[85%] md:max-w-[75%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xl transition-transform group-hover:scale-110 ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-accent to-[#d4b02c] text-[#0f0e0d]'}`}>
                                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                        </div>
                                        <div className={`relative p-5 rounded-[2rem] shadow-2xl transition-all ${
                                            msg.role === 'user' 
                                                ? 'bg-blue-600 text-white rounded-tr-sm border border-blue-400/30' 
                                                : 'bg-surface border border-border rounded-tl-sm text-gray-200'
                                        }`}>
                                            <p className="font-serif text-lg leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            
                                            {msg.role === 'assistant' && (
                                                <button 
                                                    onClick={() => speak(msg.content)}
                                                    className="absolute -right-12 top-0 p-2 text-muted hover:text-accent transition-colors md:opacity-0 group-hover:opacity-100"
                                                    title="Replay Audio"
                                                >
                                                    <Volume2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center">
                                        <Loader2 size={20} className="animate-spin text-accent" />
                                    </div>
                                    <div className="bg-surface/50 border border-border px-6 py-4 rounded-[1.5rem] rounded-tl-sm flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-2 bg-surface/50 backdrop-blur-xl border border-border rounded-[2.5rem] shadow-2xl mb-4 focus-within:border-accent/50 transition-all">
                            <div className="flex gap-2 p-1">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Apna jawab yahan likhiye..."
                                    className="flex-1 bg-transparent px-6 py-4 font-plex text-base outline-none text-text placeholder:text-muted/40"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    className="px-6 bg-accent text-[#0f0e0d] rounded-[2rem] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-accent/20 flex items-center gap-2 font-bold"
                                >
                                    <span className="hidden sm:inline">Bhejein</span>
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="flex justify-between items-center px-6 pb-2">
                                <div className="flex items-center gap-2">
                                    {isSpeaking && (
                                        <div className="flex gap-0.5 items-end h-3">
                                            <div className="w-0.5 h-full bg-accent animate-[bounce_0.8s_infinite]"></div>
                                            <div className="w-0.5 h-2/3 bg-accent animate-[bounce_0.8s_infinite_0.1s]"></div>
                                            <div className="w-0.5 h-full bg-accent animate-[bounce_0.8s_infinite_0.2s]"></div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-muted font-plex uppercase tracking-widest font-bold">
                                        {isSpeaking ? 'AI is speaking...' : 'Hindi/English mix supported'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setStatus('setup')}
                                    className="text-[9px] text-red-400 hover:text-red-300 font-plex font-bold uppercase tracking-widest transition-colors"
                                >
                                    End Session
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
