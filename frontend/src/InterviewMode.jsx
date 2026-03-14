
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Mic, MicOff, ArrowLeft, Volume2, Square, Play,
    Bot, User, Loader2, RefreshCcw, ChevronRight, Sparkles, Settings, X, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Groq API call helper ───────────────────────────────────────────────────
const groqChat = async (apiKey, messages, model = 'llama-3.3-70b-versatile', maxTokens = 600) => {
    const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model, messages, temperature: 0.7, max_tokens: maxTokens },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    return res.data.choices[0].message.content || '';
};

// ─── Text-to-speech helper ──────────────────────────────────────────────────
const speak = (text, onEnd) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '');
    const u = new SpeechSynthesisUtterance(plain);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('en'));
    if (preferred) u.voice = preferred;
    u.rate = 1.05;
    u.pitch = 1.1;
    u.onend = onEnd || null;
    window.speechSynthesis.speak(u);
};
const stopSpeaking = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

// ─── Message bubble ──────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
    const isAI = msg.role === 'ai';
    return (
        <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'} animate-fadeIn`}>
            {/* Avatar */}
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                isAI ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-surface2 border border-border text-muted'
            }`}>
                {isAI ? <Bot size={18} /> : <User size={18} />}
            </div>
            {/* Bubble */}
            <div className={`max-w-[78%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-plex shadow-sm ${
                isAI
                    ? 'bg-surface border border-border text-text rounded-tl-sm'
                    : 'bg-accent/10 border border-accent/25 text-text rounded-tr-sm'
            }`}>
                {msg.typing ? (
                    <span className="flex gap-1 items-center py-1">
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
                {msg.score !== undefined && (
                    <div className={`mt-3 pt-3 border-t border-border/50 flex items-center gap-2 font-bold text-base ${
                        msg.score >= 70 ? 'text-green-500' : msg.score >= 40 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                        Score: {msg.score}%
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
export default function InterviewMode() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Data
    const [data, setData] = useState({ categories: [], questions: [] });
    const [loading, setLoading] = useState(true);

    // Interview State
    const [phase, setPhase] = useState('setup'); // setup | interview | finished
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Mixed');
    const [interviewName, setInterviewName] = useState('');
    const [messages, setMessages] = useState([]);
    const [questionsQueue, setQuestionsQueue] = useState([]);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [questionsAsked, setQuestionsAsked] = useState(0);
    const [selectedTotal, setSelectedTotal] = useState(10);
    const [scores, setScores] = useState([]);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [waitingForAnswer, setWaitingForAnswer] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [interviewDone, setInterviewDone] = useState(false);
    const [summary, setSummary] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Voice
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [transcribing, setTranscribing] = useState(false);
    const [useGroqWhisper, setUseGroqWhisper] = useState(() => localStorage.getItem('useGroqAI') === 'true');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    const chatBottomRef = useRef(null);
    const inputRef = useRef(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [inputMode, setInputMode] = useState('voice'); // voice | text

    // Load questions
    useEffect(() => {
        const load = (d) => {
            setData(d);
            setLoading(false);
        };
        axios.get('/data.json').then(r => load(r.data)).catch(() =>
            axios.get('/api/data').then(r => load(r.data))
        );
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Browser speech recognition setup
    useEffect(() => {
        if (!useGroqWhisper && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SR();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-IN';
            recognitionRef.current.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) finalTranscriptRef.current += t + ' ';
                    else interim += t;
                }
                setTranscript(finalTranscriptRef.current + interim);
            };
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, [useGroqWhisper]);

    // ── Voice recording ──────────────────────────────────────────────────────
    const startListening = async () => {
        setTranscript('');
        finalTranscriptRef.current = '';
        if (useGroqWhisper) {
            if (!apiKey) { alert('Please add your Groq API key in Settings ⚙'); return; }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunksRef.current = [];
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    transcribeGroq(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                recorder.start();
                mediaRecorderRef.current = recorder;
                setIsListening(true);
            } catch { alert('Microphone permission denied.'); }
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (useGroqWhisper && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
    };

    const transcribeGroq = async (blob) => {
        setTranscribing(true);
        const fd = new FormData();
        fd.append('file', new File([blob], 'audio.webm', { type: 'audio/webm' }));
        fd.append('model', 'whisper-large-v3-turbo');
        fd.append('language', 'en');
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', fd, {
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'multipart/form-data' }
            });
            setTranscript(res.data.text);
        } catch { alert('Groq Whisper transcription failed. Check your API key.'); }
        setTranscribing(false);
    };

    // ── AI Message Helpers ───────────────────────────────────────────────────
    const addAIMessage = (content, extra = {}) => {
        setMessages(prev => [...prev, { role: 'ai', content, ...extra }]);
    };
    const addUserMessage = (content) => {
        setMessages(prev => [...prev, { role: 'user', content }]);
    };
    const addTypingIndicator = () => {
        const id = Date.now();
        setMessages(prev => [...prev, { role: 'ai', content: '', typing: true, id }]);
        return id;
    };
    const removeTypingAndAdd = (id, content, extra = {}) => {
        setMessages(prev => prev.filter(m => m.id !== id).concat({ role: 'ai', content, ...extra }));
    };

    // ── Start Interview ──────────────────────────────────────────────────────
    const startInterview = async () => {
        if (!apiKey) { setShowSettings(true); return; }
        setErrorMsg('');
        setAiSpeaking(true); // Show loading on setup screen

        let filtered = data.questions || [];
        if (selectedCategory !== 'All') {
            const catId = data.categories?.find(c => c.name === selectedCategory)?.id;
            if (catId !== undefined) filtered = filtered.filter(q => q.cat === catId);
        }
        if (selectedDifficulty !== 'Mixed') {
            filtered = filtered.filter(q =>
                selectedDifficulty === 'Beginner' ? (q.q?.length || 0) < 80 :
                selectedDifficulty === 'Intermediate' ? (q.q?.length || 0) < 150 : true
            );
        }
        if (filtered.length === 0) filtered = data.questions || [];
        if (filtered.length === 0) {
            setAiSpeaking(false);
            setErrorMsg('No questions found. Please reload the page.');
            return;
        }

        const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, selectedTotal);

        // Build the first message BEFORE switching phase
        const name = interviewName.trim() || 'there';
        let greeting = `Hi ${name}! 👋 Welcome to your accounting interview with me, Aria. I'll ask you ${selectedTotal} questions — just speak or type your answers. Let's begin!`;

        try {
            const res = await groqChat(apiKey, [
                {
                    role: 'system',
                    content: `You are Aria, an expert US accounting & bookkeeping interviewer AI. Warm, professional, concise.`
                },
                {
                    role: 'user',
                    content: `Greet "${name}", say you'll ask ${selectedTotal} accounting questions. 2 sentences, enthusiastic.`
                }
            ], 'llama-3.3-70b-versatile', 120);
            if (res && res.trim()) greeting = res;
        } catch (err) {
            console.error('Greeting fetch error (using fallback):', err);
        }

        // NOW switch phase — messages already have content
        setMessages([{ role: 'ai', content: greeting }]);
        setQuestionsQueue(shuffled);
        setCurrentQIdx(0);
        setQuestionsAsked(0);
        setScores([]);
        setInterviewDone(false);
        setSummary(null);
        setWaitingForAnswer(false);
        setAiSpeaking(false);
        setPhase('interview'); // Switch LAST — screen is never blank

        speak(greeting, () => setTimeout(() => askNextQuestion(shuffled, 0), 800));
        setTimeout(() => askNextQuestion(shuffled, 0), 3500); // Fallback if TTS not supported
    };

    // ── Ask Next Question ─────────────────────────────────────────────────────
    const askNextQuestion = async (queue, idx) => {
        if (idx >= (queue?.length || 0)) {
            finishInterview();
            return;
        }

        const q = queue[idx];
        if (!q) { finishInterview(); return; }

        const typingId = addTypingIndicator();
        setAiSpeaking(true);
        setWaitingForAnswer(false);
        setCurrentQIdx(idx);
        setQuestionsAsked(idx + 1);

        try {
            // Use Groq to rephrase question naturally
            const questionMsg = await groqChat(apiKey, [
                {
                    role: 'system',
                    content: 'You are Aria, a professional accounting interviewer. Ask the following question naturally as if in a real interview. Keep it to 1-2 sentences max. Do NOT give hints or answers.'
                },
                {
                    role: 'user',
                    content: `Question ${idx + 1} of ${queue.length}: ${q.q}`
                }
            ], 'llama-3.3-70b-versatile', 100);

            removeTypingAndAdd(typingId, questionMsg);
            setAiSpeaking(false);
            setWaitingForAnswer(true);
            speak(questionMsg);
        } catch (err) {
            console.error('Question error:', err);
            // Fallback: show the raw question
            removeTypingAndAdd(typingId, `Question ${idx + 1}: ${q.q}`);
            setAiSpeaking(false);
            setWaitingForAnswer(true);
        }
    };

    // ── Submit Answer ────────────────────────────────────────────────────────
    const submitAnswer = async () => {
        const userAns = inputMode === 'voice' ? transcript : textAnswer;
        if (!userAns.trim()) { alert('Please say or type your answer first!'); return; }

        stopSpeaking();
        if (isListening) stopListening();

        addUserMessage(userAns);
        setTranscript('');
        setTextAnswer('');
        setWaitingForAnswer(false);
        setEvaluating(true);

        const q = questionsQueue[currentQIdx];
        const typingId = addTypingIndicator();

        try {
            const feedbackText = await groqChat(apiKey, [
                {
                    role: 'system',
                    content: `You are Aria, an expert accounting interviewer and coach. Evaluate the candidate's answer. Be constructive but honest. 
Format your response EXACTLY as JSON:
{"score": <0-100>, "feedback": "<2-3 sentence evaluation>", "tip": "<one actionable improvement tip>"}`
                },
                {
                    role: 'user',
                    content: `Question: ${q.q}\nCorrect Answer Context: ${(q.a || '').replace(/<[^>]+>/g, ' ')}\nCandidate's Answer: ${userAns}`
                }
            ], 'llama-3.3-70b-versatile', 300);

            let parsed = null;
            try {
                const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : feedbackText);
            } catch {
                parsed = { score: 50, feedback: feedbackText, tip: '' };
            }

            const score = parsed.score || 50;
            const feedbackContent = `${parsed.feedback}${parsed.tip ? `\n\n💡 Tip: ${parsed.tip}` : ''}`;

            setScores(prev => [...prev, score]);
            removeTypingAndAdd(typingId, feedbackContent, { score });
            setEvaluating(false);

            speak(parsed.feedback, () => {
                // After feedback, move to next question
                const nextIdx = currentQIdx + 1;
                if (nextIdx < questionsQueue.length) {
                    setTimeout(() => askNextQuestion(questionsQueue, nextIdx), 1200);
                } else {
                    setTimeout(() => finishInterview(), 1200);
                }
            });
        } catch (err) {
            removeTypingAndAdd(typingId, "I had trouble evaluating that. Let me move on to the next question.");
            setEvaluating(false);
            setTimeout(() => askNextQuestion(questionsQueue, currentQIdx + 1), 1500);
        }
    };

    // ── Finish Interview ─────────────────────────────────────────────────────
    const finishInterview = async () => {
        setWaitingForAnswer(false);
        setInterviewDone(true);

        const typingId = addTypingIndicator();
        setAiSpeaking(true);

        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        const closingMsg = await groqChat(apiKey, [
            {
                role: 'system',
                content: 'You are Aria, a professional accounting interviewer. The interview is over. Give a warm, encouraging closing message. 2 sentences max.'
            },
            {
                role: 'user',
                content: `The interview is over. Average score: ${avgScore}%. Give a concise closing remark.`
            }
        ], 'llama-3.3-70b-versatile', 100);

        removeTypingAndAdd(typingId, closingMsg);
        setAiSpeaking(false);
        setPhase('finished');
        speak(closingMsg);

        // Generate detailed summary
        try {
            const summaryText = await groqChat(apiKey, [
                {
                    role: 'system',
                    content: `You are an expert accounting career coach. Generate a structured performance summary. Return ONLY valid JSON:
{"overallScore": <0-100>, "strengths": ["str1","str2"], "improvements": ["imp1","imp2"], "nextSteps": "<1-2 sentences advice>"}`
                },
                {
                    role: 'user',
                    content: `Interview scores per question: ${scores.join(', ')}. Average: ${avgScore}%. Topics covered: ${questionsQueue.map(q => q.q?.substring(0, 40)).join('; ')}`
                }
            ], 'llama-3.3-70b-versatile', 300);

            const match = summaryText.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(match ? match[0] : summaryText);
            setSummary(parsed);
        } catch {
            setSummary({ overallScore: avgScore, strengths: ['Good attempt'], improvements: ['Review accounting basics'], nextSteps: 'Keep practicing daily!' });
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <Loader2 className="text-accent animate-spin" size={32} />
        </div>
    );

    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return (
        <div className="min-h-screen bg-bg text-text flex flex-col" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-lg hover:border-accent/50 transition-all text-muted hover:text-accent">
                        <ArrowLeft size={17} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                            <Bot size={16} className="text-accent" />
                        </div>
                        <div>
                            <h1 className="font-bold text-text text-sm md:text-base leading-none">Aria AI Interviewer</h1>
                            <p className="text-[10px] text-muted">Powered by Groq LLaMA 3.3</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {phase === 'interview' && (
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="bg-surface2 border border-border rounded-full px-3 py-1 font-plex text-xs text-muted">
                                Q {Math.min(questionsAsked, totalQuestions)}/{totalQuestions}
                            </div>
                            {scores.length > 0 && (
                                <div className={`border rounded-full px-3 py-1 font-plex text-xs font-bold ${
                                    avgScore >= 70 ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                                    avgScore >= 40 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                    'bg-red-500/10 border-red-500/30 text-red-500'
                                }`}>
                                    Avg {avgScore}%
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => setShowSettings(s => !s)} className="p-2 bg-bg border border-border rounded-lg hover:border-accent/50 transition-all text-muted hover:text-accent">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* ── Settings Panel ──────────────────────────────────────────── */}
            {showSettings && (
                <div className="bg-surface border-b border-border px-4 py-4 animate-fadeIn">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-sm text-text">⚙ Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-muted hover:text-text"><X size={16} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-1">Groq API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        placeholder="gsk_xxxxxxxx..."
                                        value={apiKeyInput || apiKey}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                        className="flex-1 bg-bg border border-border px-3 py-2 rounded-lg text-xs font-plex outline-none focus:border-accent"
                                    />
                                    <button
                                        onClick={() => {
                                            const k = apiKeyInput || apiKey;
                                            setApiKey(k);
                                            localStorage.setItem('groqApiKey', k);
                                            setShowSettings(false);
                                        }}
                                        className="bg-accent text-[#0f0e0d] text-xs font-bold px-4 py-2 rounded-lg"
                                    >Save</button>
                                </div>
                                {apiKey && <p className="text-[10px] text-green-500 mt-1">✔ API key configured</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-1">Transcription Engine</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setUseGroqWhisper(false); localStorage.setItem('useGroqAI', 'false'); }}
                                        className={`px-3 py-1.5 text-xs font-plex font-semibold rounded-lg border transition-all ${!useGroqWhisper ? 'bg-bg border-accent text-accent' : 'border-border text-muted'}`}
                                    >Browser Built-in</button>
                                    <button
                                        onClick={() => { setUseGroqWhisper(true); localStorage.setItem('useGroqAI', 'true'); }}
                                        className={`px-3 py-1.5 text-xs font-plex font-semibold rounded-lg border transition-all ${useGroqWhisper ? 'bg-accent text-[#0f0e0d] border-accent' : 'border-border text-muted'}`}
                                    >✨ Groq Whisper (Recommended)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SETUP PHASE ─────────────────────────────────────────────── */}
            {phase === 'setup' && (
                <div className="flex-1 flex items-center justify-center px-4 py-10">
                    <div className="w-full max-w-lg">
                        {/* Hero */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 rounded-3xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/10">
                                <Bot size={36} className="text-accent" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-text mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Meet Aria</h2>
                            <p className="text-muted text-sm leading-relaxed">Your AI accounting interviewer. Aria will ask you questions, listen to your answers, and give real-time expert feedback — just like a real interview.</p>
                        </div>

                        {/* Config Card */}
                        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-2">Your Name (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ahmed"
                                    value={interviewName}
                                    onChange={e => setInterviewName(e.target.value)}
                                    className="w-full bg-bg border border-border px-4 py-3 rounded-xl text-sm font-plex outline-none focus:border-accent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-2">Topic / Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full bg-bg border border-border px-4 py-3 rounded-xl text-sm font-plex outline-none focus:border-accent appearance-none cursor-pointer"
                                >
                                    <option value="All">All Topics</option>
                                    {data.categories?.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-2">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Beginner', 'Intermediate', 'Mixed'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setSelectedDifficulty(d)}
                                            className={`py-2.5 rounded-xl text-xs font-bold font-plex border transition-all ${
                                                selectedDifficulty === d
                                                    ? 'bg-accent text-[#0f0e0d] border-accent shadow-md shadow-accent/20'
                                                    : 'bg-bg border-border text-muted hover:border-accent/50 hover:text-text'
                                            }`}
                                        >
                                            {d === 'Beginner' ? '🟢' : d === 'Intermediate' ? '🟡' : '🔀'} {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-muted mb-2">Number of Questions</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[5, 10, 20, 30, 50].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setSelectedTotal(n)}
                                            className={`py-2.5 rounded-xl text-xs font-bold font-plex border transition-all ${
                                                selectedTotal === n
                                                    ? 'bg-accent text-[#0f0e0d] border-accent shadow-md shadow-accent/20'
                                                    : 'bg-bg border-border text-muted hover:border-accent/50 hover:text-text'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted font-plex mt-1.5">Select how many questions you want to practice</p>
                            </div>

                            {!apiKey && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-plex text-red-400">
                                    ⚠ Add your free Groq API key in <button onClick={() => setShowSettings(true)} className="underline font-bold">Settings ⚙</button> to start.
                                    Get it free at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline">console.groq.com</a>
                                </div>
                            )}

                            <button
                                onClick={startInterview}
                                disabled={!apiKey || aiSpeaking}
                                className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-base ${
                                    !apiKey
                                        ? 'bg-surface2 text-muted cursor-not-allowed'
                                        : aiSpeaking
                                        ? 'bg-accent/70 text-[#0f0e0d] cursor-wait'
                                        : 'bg-accent text-[#0f0e0d] hover:scale-[1.02] shadow-lg shadow-accent/25'
                                }`}
                            >
                                {aiSpeaking ? (
                                    <><Loader2 size={20} className="animate-spin" /> Connecting to Aria...</>
                                ) : (
                                    <><Play size={20} fill="currentColor" /> Start Interview with Aria</>
                                )}
                            </button>

                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-plex text-red-400">
                                    ⚠ {errorMsg}
                                </div>
                            )}
                        </div>

                        <p className="text-center text-[11px] text-muted mt-4 font-plex">
                            Free · Powered by Groq LLaMA 3.3 70B · {selectedTotal} questions per session
                        </p>
                    </div>
                </div>
            )}

            {/* ── INTERVIEW PHASE ──────────────────────────────────────────── */}
            {(phase === 'interview' || phase === 'finished') && (
                <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-3 py-4 gap-3">

                    {/* Progress bar */}
                    {phase === 'interview' && (
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-plex text-muted shrink-0">Q {Math.min(questionsAsked, selectedTotal)}/{selectedTotal}</span>
                            <div className="flex-1 bg-surface border border-border rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-accent h-full rounded-full transition-all duration-700"
                                    style={{ width: `${(Math.min(questionsAsked, selectedTotal) / selectedTotal) * 100}%` }}
                                />
                            </div>
                            {scores.length > 0 && (
                                <span className={`text-[10px] font-plex font-bold shrink-0 ${avgScore >= 70 ? 'text-green-500' : avgScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {avgScore}% avg
                                </span>
                            )}
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 pb-2 min-h-[200px]">
                        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
                        <div ref={chatBottomRef} />
                    </div>

                    {/* ── Input Area ─────────────────────────────────────── */}
                    {phase === 'interview' && waitingForAnswer && (
                        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xl space-y-3">
                            {/* Mode toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setInputMode('voice')}
                                    className={`flex-1 py-2 text-xs font-bold font-plex rounded-xl border transition-all flex items-center justify-center gap-1 ${
                                        inputMode === 'voice' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border text-muted'
                                    }`}
                                >
                                    <Mic size={13} /> Voice
                                </button>
                                <button
                                    onClick={() => setInputMode('text')}
                                    className={`flex-1 py-2 text-xs font-bold font-plex rounded-xl border transition-all ${
                                        inputMode === 'text' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border text-muted'
                                    }`}
                                >
                                    ⌨ Type
                                </button>
                            </div>

                            {/* Voice mode */}
                            {inputMode === 'voice' && (
                                <div className="space-y-2">
                                    {/* Mic button */}
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        disabled={transcribing || evaluating}
                                        className={`w-full py-3.5 rounded-xl font-bold font-plex text-sm flex items-center justify-center gap-2 transition-all ${
                                            isListening
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                                : 'bg-accent text-[#0f0e0d] hover:scale-[1.01] shadow-lg shadow-accent/20'
                                        } ${(transcribing || evaluating) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {isListening ? <><MicOff size={18} /> Stop Recording</> : <><Mic size={18} /> Tap to Speak</>}
                                    </button>

                                    {/* Transcript preview */}
                                    {(transcribing || transcript) && (
                                        <div className="bg-bg border border-border rounded-xl px-4 py-3 min-h-[60px]">
                                            {transcribing ? (
                                                <span className="text-accent text-xs animate-pulse flex items-center gap-2">
                                                    <Loader2 size={13} className="animate-spin" /> Transcribing...
                                                </span>
                                            ) : (
                                                <p className="text-sm text-text/90 font-plex italic">"{transcript}"</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Submit */}
                                    {transcript && !isListening && !transcribing && (
                                        <button
                                            onClick={submitAnswer}
                                            disabled={evaluating}
                                            className={`w-full py-3 rounded-xl font-bold font-plex text-sm flex items-center justify-center gap-2 transition-all ${
                                                evaluating
                                                    ? 'bg-accent/40 text-bg cursor-not-allowed animate-pulse'
                                                    : 'bg-surface2 border border-accent text-accent hover:bg-accent hover:text-[#0f0e0d]'
                                            }`}
                                        >
                                            {evaluating ? <><Loader2 size={15} className="animate-spin" /> Aria is evaluating...</> : <><Check size={15} /> Submit Answer</>}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Text mode */}
                            {inputMode === 'text' && (
                                <div className="space-y-2">
                                    <textarea
                                        ref={inputRef}
                                        value={textAnswer}
                                        onChange={e => setTextAnswer(e.target.value)}
                                        placeholder="Type your answer here..."
                                        rows={3}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-plex text-text outline-none focus:border-accent resize-none transition-all"
                                    />
                                    <button
                                        onClick={submitAnswer}
                                        disabled={evaluating || !textAnswer.trim()}
                                        className={`w-full py-3 rounded-xl font-bold font-plex text-sm flex items-center justify-center gap-2 transition-all ${
                                            evaluating || !textAnswer.trim()
                                                ? 'bg-accent/30 text-bg cursor-not-allowed'
                                                : 'bg-accent text-[#0f0e0d] hover:scale-[1.01] shadow-lg shadow-accent/20'
                                        }`}
                                    >
                                        {evaluating ? <><Loader2 size={15} className="animate-spin" /> Evaluating...</> : <><Check size={15} /> Submit Answer</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Waiting for AI */}
                    {phase === 'interview' && (aiSpeaking || evaluating) && !waitingForAnswer && (
                        <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted font-plex">
                            <Loader2 size={13} className="animate-spin text-accent" />
                            {evaluating ? 'Aria is evaluating your answer...' : 'Aria is speaking...'}
                            <button onClick={stopSpeaking} className="ml-auto text-muted hover:text-text">
                                <Square size={13} fill="currentColor" />
                            </button>
                        </div>
                    )}

                    {/* ── Summary Card (Finished) ─────────────────────────── */}
                    {phase === 'finished' && summary && (
                        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xl space-y-4 mt-4">
                            <div className="flex items-center gap-3">
                                <div className={`text-4xl font-black ${avgScore >= 70 ? 'text-green-500' : avgScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {summary.overallScore || avgScore}%
                                </div>
                                <div>
                                    <p className="font-bold text-text" style={{ fontFamily: 'Playfair Display, serif' }}>Interview Complete</p>
                                    <p className="text-xs text-muted font-plex">Overall performance score</p>
                                </div>
                            </div>

                            {summary.strengths?.length > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-2">✅ Strengths</p>
                                    <ul className="space-y-1">
                                        {summary.strengths.map((s, i) => <li key={i} className="text-xs text-text font-plex">• {s}</li>)}
                                    </ul>
                                </div>
                            )}

                            {summary.improvements?.length > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2">📈 Areas to Improve</p>
                                    <ul className="space-y-1">
                                        {summary.improvements.map((s, i) => <li key={i} className="text-xs text-text font-plex">• {s}</li>)}
                                    </ul>
                                </div>
                            )}

                            {summary.nextSteps && (
                                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">🎯 Next Steps</p>
                                    <p className="text-xs text-text font-plex">{summary.nextSteps}</p>
                                </div>
                            )}

                            {/* Score per question */}
                            <div className="bg-bg border border-border rounded-xl p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Per-Question Scores</p>
                                <div className="flex gap-2 flex-wrap">
                                    {scores.map((s, i) => (
                                        <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold font-plex ${
                                            s >= 70 ? 'bg-green-500/15 text-green-500' :
                                            s >= 40 ? 'bg-yellow-500/15 text-yellow-500' :
                                            'bg-red-500/15 text-red-500'
                                        }`}>
                                            Q{i + 1}: {s}%
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => { setPhase('setup'); setMessages([]); setScores([]); setSummary(null); }}
                                className="w-full bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-accent/20"
                            >
                                <RefreshCcw size={17} /> Start New Interview
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
