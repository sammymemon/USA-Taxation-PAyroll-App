import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Mic, MicOff, ArrowLeft, Play, Pause, Bot, User,
    Loader2, RefreshCcw, Settings, X, Check, Volume2, Square
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Groq helpers ────────────────────────────────────────────────────────────
async function callGroq(apiKey, messages, maxTokens = 400) {
    try {
        const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: maxTokens
            },
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        return res.data?.choices?.[0]?.message?.content || '';
    } catch (e) {
        console.error('Groq API error:', e?.response?.data || e.message);
        return null;
    }
}

// ─── TTS ─────────────────────────────────────────────────────────────────────
function ttsSpeak(text) {
    try {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, ''));
        u.rate = 1.0;
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    } catch (e) { /* TTS errors are non-critical */ }
}
function ttsStop() {
    try { window.speechSynthesis?.cancel(); } catch (e) { }
}

// Module-level tracker so only 1 bubble speaks at a time
let _activeTtsSetter = null;

// Strip emoji and markdown symbols for clean TTS audio
function cleanForTTS(text) {
    return (text || '')
        .replace(/[✅❌⚠️📖🏢💡👋]/g, '')
        .replace(/\*\*/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── Chat Bubble with TTS play/pause button ───────────────────────────────────
const Bubble = ({ msg }) => {
    const ai = msg.role === 'ai';
    const [tts, setTts] = useState('idle'); // idle | speaking | paused

    const handleTTS = () => {
        if (!('speechSynthesis' in window)) return;
        if (tts === 'speaking') {
            window.speechSynthesis.pause();
            setTts('paused');
        } else if (tts === 'paused') {
            window.speechSynthesis.resume();
            setTts('speaking');
        } else {
            // Stop whatever is currently playing
            if (_activeTtsSetter) { _activeTtsSetter('idle'); _activeTtsSetter = null; }
            window.speechSynthesis.cancel();

            const u = new SpeechSynthesisUtterance(cleanForTTS(msg.content));
            u.rate = 1.0;
            u.lang = 'en-US';
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang === 'en-US') || voices[0];
            if (voice) u.voice = voice;
            u.onstart = () => { setTts('speaking'); _activeTtsSetter = setTts; };
            u.onend   = () => { setTts('idle');     _activeTtsSetter = null; };
            u.onerror = () => { setTts('idle');     _activeTtsSetter = null; };
            setTts('speaking');
            _activeTtsSetter = setTts;
            window.speechSynthesis.speak(u);
        }
    };

    return (
        <div className={`flex gap-3 mb-4 ${ai ? '' : 'flex-row-reverse'}`}>
            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                ai ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                   : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
                {ai ? 'A' : 'U'}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                ai ? 'bg-surface border border-border text-text rounded-tl-none'
                   : 'bg-accent/10 border border-accent/30 text-text rounded-tr-none'
            }`}>
                {msg.typing ? (
                    <span className="flex gap-1">
                        {[0,150,300].map(d => (
                            <span key={d} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay:`${d}ms`}} />
                        ))}
                    </span>
                ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
                {msg.score != null && (
                    <div className={`mt-2 pt-2 border-t border-border/40 font-bold text-base ${
                        msg.score >= 70 ? 'text-green-500' : msg.score >= 40 ? 'text-yellow-500' : 'text-red-500'
                    }`}>Score: {msg.score}%</div>
                )}
                {/* TTS button — only on non-typing AI bubbles */}
                {ai && !msg.typing && msg.content && (
                    <button
                        onClick={handleTTS}
                        title={tts === 'speaking' ? 'Pause' : tts === 'paused' ? 'Resume' : 'Listen'}
                        className={`mt-2 pt-2 border-t border-border/30 w-full flex items-center gap-1.5 text-[10px] font-plex font-bold transition-all ${
                            tts !== 'idle' ? 'text-accent' : 'text-muted hover:text-accent'
                        }`}
                    >
                        {tts === 'speaking'
                            ? <><Pause size={11} fill="currentColor" /> Pause</>
                            : tts === 'paused'
                            ? <><Play  size={11} fill="currentColor" /> Resume</>
                            : <><Volume2 size={11} /> Listen</>
                        }
                    </button>
                )}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
export default function InterviewMode() {
    // API key
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [keyInput, setKeyInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Data
    const [questions, setQuestions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Setup options
    const [yourName, setYourName] = useState('');
    const [category, setCategory] = useState('All');
    const [difficulty, setDifficulty] = useState('Mixed');
    const [numQ, setNumQ] = useState(10);

    // Interview flow — simple state machine
    // screen: 'setup' | 'interview' | 'done'
    const [screen, setScreen] = useState('setup');
    const [starting, setStarting] = useState(false); // loading spinner on button
    const [msgs, setMsgs] = useState([]);
    const [queue, setQueue] = useState([]);
    const [qIdx, setQIdx] = useState(0);
    const [scores, setScores] = useState([]);
    const [busy, setBusy] = useState(false); // AI is generating
    const [showInput, setShowInput] = useState(false);
    const [summary, setSummary] = useState(null);

    // Voice / Text input
    const [inputMode, setInputMode] = useState('voice');
    const [listening, setListening] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const [transcribing, setTranscribing] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [useWhisper, setUseWhisper] = useState(() => localStorage.getItem('useGroqAI') === 'true');

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const srRef = useRef(null);
    const srFinalRef = useRef('');
    const bottomRef = useRef(null);

    // Scroll to bottom whenever msgs change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // Load data
    useEffect(() => {
        const apply = (d) => {
            setQuestions(d.questions || []);
            setCategories(d.categories || []);
            setLoading(false);
        };
        axios.get('/data.json').then(r => apply(r.data)).catch(() =>
            axios.get('/api/data').then(r => apply(r.data)).catch(() => setLoading(false))
        );
    }, []);

    // Browser speech recognition
    useEffect(() => {
        if (!useWhisper && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            const sr = new SR();
            sr.continuous = true;
            sr.interimResults = true;
            sr.lang = 'en-IN';
            sr.onresult = e => {
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) srFinalRef.current += e.results[i][0].transcript + ' ';
                    else interim += e.results[i][0].transcript;
                }
                setVoiceText(srFinalRef.current + interim);
            };
            sr.onend = () => setListening(false);
            srRef.current = sr;
        }
    }, [useWhisper]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const addMsg = (role, content, extra = {}) =>
        setMsgs(prev => [...prev, { role, content, ...extra }]);

    const addTyping = () => {
        const id = `t${Date.now()}`;
        setMsgs(prev => [...prev, { role: 'ai', content: '', typing: true, id }]);
        return id;
    };

    const resolveTyping = (id, content, extra = {}) =>
        setMsgs(prev => prev.map(m => m.id === id ? { role: 'ai', content, ...extra } : m));

    // ── Voice recording ───────────────────────────────────────────────────────
    const startListen = async () => {
        setVoiceText('');
        srFinalRef.current = '';
        if (useWhisper) {
            if (!apiKey) { alert('Add Groq API key in Settings first!'); return; }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                chunksRef.current = [];
                const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
                rec.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    transcribeBlob(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                rec.start();
                recorderRef.current = rec;
                setListening(true);
            } catch { alert('Microphone permission denied.'); }
        } else {
            srRef.current?.start();
            setListening(true);
        }
    };

    const stopListen = () => {
        if (useWhisper) { recorderRef.current?.stop(); }
        else { srRef.current?.stop(); }
        setListening(false);
    };

    const transcribeBlob = async (blob) => {
        setTranscribing(true);
        const fd = new FormData();
        fd.append('file', new File([blob], 'audio.webm', { type: 'audio/webm' }));
        fd.append('model', 'whisper-large-v3-turbo');
        fd.append('language', 'en');
        try {
            const r = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', fd, {
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'multipart/form-data' }
            });
            setVoiceText(r.data.text || '');
        } catch { setVoiceText('(transcription failed — please type your answer)'); }
        setTranscribing(false);
    };

    // ── START INTERVIEW (no fixed count — runs until user ends) ─────────────
    const startInterview = async () => {
        if (!apiKey) { setShowSettings(true); return; }
        setStarting(true);

        // Build question pool (all questions, shuffled)
        let pool = [...questions];
        if (category !== 'All') {
            const cat = categories.find(c => c.name === category);
            if (cat) pool = pool.filter(q => q.cat === cat.id);
        }
        if (!pool.length) pool = [...questions];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);

        // Instant fallback greeting (no API wait)
        const name = yourName.trim() || 'there';
        const greetLocal = `Hi ${name}! 👋 I am Aria. I will ask you USA bookkeeping and payroll questions. Say or type your answer. Press "End Interview" anytime to stop. Let us begin!`;

        let greetMsg = greetLocal;
        const aiGreet = await callGroq(apiKey, [
            {
                role: 'system',
                content: `You are Aria, an AI interviewer for USA bookkeeping and payroll. You work for an Indian KPO firm.
Rules:
- Use very simple, short English. No complex words.
- 2 short sentences only.
- Be friendly and welcoming.`
            },
            { role: 'user', content: `Greet candidate named "${name}". Tell them to answer USA bookkeeping/payroll questions. Say they can press End Interview to stop.` }
        ], 80);
        if (aiGreet) greetMsg = aiGreet;

        setMsgs([{ role: 'ai', content: greetMsg }]);
        setQueue(shuffled);
        setQIdx(0);
        setScores([]);
        setSummary(null);
        setShowInput(false);
        setBusy(false);
        setVoiceText('');
        setTypedText('');
        setStarting(false);
        setScreen('interview');

        setTimeout(() => askQuestion(shuffled, 0), 800);
    };

    // ── ASK QUESTION (infinite loop — reshuffle when pool runs out) ──────────
    const askQuestion = async (q_queue, idx) => {
        let arr = q_queue || queue;

        // When all questions done — reshuffle and restart from 0
        if (idx >= arr.length) {
            const reshuffled = [...arr].sort(() => Math.random() - 0.5);
            setQueue(reshuffled);
            arr = reshuffled;
            idx = 0;
        }

        const q = arr[idx];
        setBusy(true);
        setShowInput(false);
        setQIdx(idx);

        const tid = addTyping();

        // Vary the question style randomly for a more natural interview feel
        const styles = ['direct', 'scenario', 'explain'];
        const style = styles[idx % 3];

        const styleInstruction =
            style === 'scenario'
                ? 'Put the question as a small real-life work situation. Start with "Imagine" or "Suppose". 2 sentences max.'
                : style === 'explain'
                ? 'Ask the candidate to explain it in their own words. Start with "In your own words" or "Can you explain". 1 sentence.'
                : 'Ask the question directly and simply. 1 short sentence. No extra words.';

        const aiQ = await callGroq(apiKey, [
            {
                role: 'system',
                content: `You are Aria, an interviewer at an Indian KPO firm that handles USA bookkeeping and payroll.
You are asking interview question number ${idx + 1}.

Rules:
- Use very simple, clear English. Short words.
- Do NOT give the answer or any hint.
- ${styleInstruction}
- Sound friendly and professional, like a real interviewer.`
            },
            {
                role: 'user',
                content: `Question to ask: ${q.q}`
            }
        ], 80);

        const finalQ = aiQ || q.q;
        resolveTyping(tid, finalQ);
        setBusy(false);
        setShowInput(true);
        ttsSpeak(finalQ);
    };

    // ── SUBMIT ANSWER ─────────────────────────────────────────────────────────
    const submitAnswer = async () => {
        const ans = inputMode === 'voice' ? voiceText : typedText;
        if (!ans.trim()) { alert('Please give an answer first!'); return; }

        ttsStop();
        if (listening) stopListen();

        addMsg('user', ans);
        setVoiceText('');
        setTypedText('');
        setShowInput(false);
        setBusy(true);

        const q = queue[qIdx];
        const tid = addTyping();

        // Evaluate — structured feedback with real-world example
        const correctAns = (q.a || '').replace(/<[^>]+>/g, ' ').trim();
        const raw = await callGroq(apiKey, [
            {
                role: 'system',
                content: `You are Aria, an expert USA bookkeeping and payroll trainer for an Indian KPO firm.
Your job: check the candidate's answer and give clear, simple feedback.

Rules:
- Use very simple English. Short sentences. Like explaining to a new employee.
- Be warm and encouraging, even when the answer is wrong.
- Give a real-world USA work example to explain the correct answer.
- Return ONLY valid JSON in exactly this format:
{
  "score": <number 0 to 100>,
  "verdict": "<one of: Correct / Partially Correct / Incorrect>",
  "feedback": "<1-2 short sentences: what was right or wrong in their answer>",
  "correct_answer": "<the correct answer explained simply, as if teaching a beginner>",
  "example": "<one real USA work example, like: For example, when XYZ company pays employee John...>",
  "tip": "<one short thing to remember, max 15 words>"
}`
            },
            {
                role: 'user',
                content: `Question: ${q.q}\nCorrect Answer (reference): ${correctAns}\nCandidate said: ${ans}`
            }
        ], 400);

        let score = 50;
        let feedbackContent = '❌ Could not check your answer. Please try again.';
        try {
            const match = (raw || '').match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(match ? match[0] : raw);
            score = Math.max(0, Math.min(100, Number(parsed.score) || 50));

            const verdict = parsed.verdict || (score >= 70 ? 'Correct' : score >= 40 ? 'Partially Correct' : 'Incorrect');
            const icon = verdict === 'Correct' ? '✅' : verdict === 'Partially Correct' ? '⚠️' : '❌';

            const parts = [];

            // Result line
            parts.push(`${icon} ${verdict.toUpperCase()} — ${parsed.feedback || ''}`);

            // Correct answer explanation
            if (parsed.correct_answer) {
                parts.push(`\n📖 Correct Answer:\n${parsed.correct_answer}`);
            }

            // Real-world example
            if (parsed.example) {
                parts.push(`\n🏢 Example:\n${parsed.example}`);
            }

            // Quick tip
            if (parsed.tip) {
                parts.push(`\n💡 Remember: ${parsed.tip}`);
            }

            feedbackContent = parts.join('\n');
        } catch {
            feedbackContent = '❌ Could not evaluate. Please try again.';
        }

        resolveTyping(tid, feedbackContent, { score });
        setScores(prev => [...prev, score]);
        setBusy(false);

        // Auto-speak the feedback so candidate can hear it
        const nextIdx = qIdx + 1;
        ttsSpeak(cleanForTTS(feedbackContent));
        // Next question: 6s to hear feedback, or adjust as needed
        setTimeout(() => askQuestion(queue, nextIdx), 6000);
    };

    // ── END INTERVIEW (called by user pressing End button) ────────────────────
    const endInterview = async () => {
        ttsStop();
        if (listening) stopListen();
        setShowInput(false);
        setBusy(true);

        const all_scores = scores.length ? scores : [50];
        const avg = Math.round(all_scores.reduce((a, b) => a + b, 0) / all_scores.length);

        const tid = addTyping();
        const closing = await callGroq(apiKey, [
            {
                role: 'system',
                content: `You are Aria. The interview is now over.
Rules:
- Use very simple, short English.
- 2 sentences only.
- Tell them their score and encourage them.`
            },
            { role: 'user', content: `Interview ended. Candidate answered ${all_scores.length} questions. Average score: ${avg}%. Give a short closing message.` }
        ], 80);
        resolveTyping(tid, closing || `Well done! You answered ${all_scores.length} questions with an average score of ${avg}%. Keep practicing every day! 💪`);
        setBusy(false);
        setScreen('done');

        // Background summary
        const sumRaw = await callGroq(apiKey, [
            {
                role: 'system',
                content: `You check USA bookkeeping and payroll interview performance for Indian KPO firms.
Return ONLY valid JSON: {"overallScore":<0-100>,"strengths":["short point 1","short point 2"],"improvements":["short point 1","short point 2"],"advice":"one short sentence"}
Use very simple English. Keep each point under 10 words.`
            },
            {
                role: 'user',
                content: `Scores for each answer: ${all_scores.join(', ')}. Overall average: ${avg}%. Total questions answered: ${all_scores.length}.`
            }
        ], 250);
        try {
            const m = (sumRaw || '').match(/\{[\s\S]*\}/);
            setSummary(JSON.parse(m ? m[0] : sumRaw));
        } catch {
            setSummary({ overallScore: avg, strengths: ['Good effort', 'Answered all questions'], improvements: ['Review payroll rules', 'Practice bookkeeping entries'], advice: 'Study US payroll and bookkeeping daily!' });
        }
    };

    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg, #0f0e0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="text-accent animate-spin" size={32} />
        </div>
    );

    return (
        <div className="min-h-screen bg-bg text-text" style={{ display: 'flex', flexDirection: 'column' }}>

            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <div className="bg-surface border-b border-border px-4 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 rounded-lg border border-border text-muted hover:text-accent hover:border-accent/50 transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="font-bold text-sm text-text flex items-center gap-2">
                            <Bot size={15} className="text-accent" /> Aria AI Interviewer
                        </div>
                        <div className="text-[10px] text-muted font-plex">Groq LLaMA 3.3 · 70B</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {screen === 'interview' && (
                        <button
                            onClick={endInterview}
                            className="px-3 py-1.5 text-xs font-bold font-plex rounded-lg border border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                        >
                            ⏹ End Interview
                        </button>
                    )}
                    {screen === 'interview' && scores.length > 0 && (
                        <div className={`text-[11px] font-bold px-3 py-1 rounded-full border font-plex ${
                            avgScore >= 70 ? 'bg-green-500/10 border-green-500/30 text-green-500'
                            : avgScore >= 40 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                            : 'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}>{avgScore}% avg</div>
                    )}
                    <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-lg border border-border text-muted hover:text-accent hover:border-accent/50 transition-all">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* ── SETTINGS ────────────────────────────────────────────────── */}
            {showSettings && (
                <div className="bg-surface border-b border-border px-4 py-4">
                    <div className="max-w-lg mx-auto">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-text">⚙ Settings</span>
                            <button onClick={() => setShowSettings(false)} className="text-muted"><X size={15} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1 tracking-wider">Groq API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={keyInput || apiKey}
                                        onChange={e => setKeyInput(e.target.value)}
                                        placeholder="gsk_..."
                                        className="flex-1 bg-bg border border-border px-3 py-2 rounded-lg text-xs font-plex text-text outline-none focus:border-accent"
                                    />
                                    <button onClick={() => {
                                        const k = keyInput || apiKey;
                                        setApiKey(k);
                                        localStorage.setItem('groqApiKey', k);
                                        setShowSettings(false);
                                    }} className="bg-accent text-[#0f0e0d] text-xs font-bold px-4 rounded-lg">Save</button>
                                </div>
                                {apiKey && <p className="text-[10px] text-green-500 mt-1">✔ Key saved</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1 tracking-wider">Voice Engine</label>
                                <div className="flex gap-2">
                                    {[['Browser', false], ['Groq Whisper ✨', true]].map(([label, val]) => (
                                        <button key={label} onClick={() => { setUseWhisper(val); localStorage.setItem('useGroqAI', String(val)); }}
                                            className={`px-3 py-1.5 text-xs rounded-lg border font-plex font-bold transition-all ${
                                                useWhisper === val ? 'bg-accent text-[#0f0e0d] border-accent' : 'border-border text-muted'
                                            }`}>{label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ SETUP SCREEN ══════════════════════════════ */}
            {screen === 'setup' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
                    <div style={{ width: '100%', maxWidth: '440px' }}>
                        {/* Hero */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-3">
                                <Bot size={28} className="text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold text-text mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Meet Aria</h2>
                            <p className="text-muted text-sm font-plex">Your AI accounting interviewer — asks questions, listens to answers, gives feedback instantly.</p>
                        </div>

                        {/* Config */}
                        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Your Name (optional)</label>
                                <input
                                    type="text"
                                    value={yourName}
                                    onChange={e => setYourName(e.target.value)}
                                    placeholder="e.g. Ahmed"
                                    className="w-full bg-bg border border-border px-3 py-2.5 rounded-xl text-sm font-plex text-text outline-none focus:border-accent transition-all"
                                />
                            </div>
                            {/* Category */}
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Topic</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full bg-bg border border-border px-3 py-2.5 rounded-xl text-sm font-plex text-text outline-none focus:border-accent appearance-none">
                                    <option value="All">All Topics ({questions.length})</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            {/* Difficulty */}
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['🟢 Beginner','Beginner'],['🟡 Intermediate','Intermediate'],['🔀 Mixed','Mixed']].map(([label, val]) => (
                                        <button key={val} onClick={() => setDifficulty(val)}
                                            className={`py-2 rounded-xl text-xs font-bold font-plex border transition-all ${
                                                difficulty === val ? 'bg-accent text-[#0f0e0d] border-accent' : 'bg-bg border-border text-muted hover:border-accent/40'
                                            }`}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            {!apiKey && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-plex text-red-400">
                                    ⚠ No API key. <button onClick={() => setShowSettings(true)} className="underline font-bold">Add it in Settings ⚙</button><br />
                                    Free key: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-bold">console.groq.com</a>
                                </div>
                            )}

                            <button
                                onClick={startInterview}
                                disabled={!apiKey || starting}
                                className={`w-full py-3.5 rounded-xl font-bold text-base font-plex flex items-center justify-center gap-2 transition-all ${
                                    !apiKey ? 'bg-surface2 text-muted cursor-not-allowed border border-border'
                                    : starting ? 'bg-accent/60 text-[#0f0e0d] cursor-wait'
                                    : 'bg-accent text-[#0f0e0d] hover:scale-[1.01] shadow-lg shadow-accent/20'
                                }`}
                            >
                                {starting
                                    ? <><Loader2 size={18} className="animate-spin" /> Connecting to Aria...</>
                                    : <><Play size={18} fill="currentColor" /> Start Interview</>
                                }
                            </button>
                        </div>
                        <p className="text-center text-[11px] text-muted mt-3 font-plex">
                            Free · Unlimited questions · Press "End Interview" to stop · Groq LLaMA 3.3 70B
                        </p>
                    </div>
                </div>
            )}

            {/* ══════════════════ INTERVIEW SCREEN ══════════════════════════ */}
            {(screen === 'interview' || screen === 'done') && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '680px', margin: '0 auto', width: '100%', padding: '12px' }}>

                    {/* Progress */}
                    {screen === 'interview' && (
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className="text-[10px] font-plex text-muted shrink-0 font-bold">Answered: {scores.length}</span>
                            <div className="flex-1 bg-surface border border-border rounded-full h-1.5 overflow-hidden">
                                <div className="bg-accent h-full rounded-full transition-all duration-700"
                                    style={{ width: `${queue.length ? (qIdx / queue.length) * 100 : 0}%` }} />
                            </div>
                            {scores.length > 0 && (
                                <span className={`text-[10px] font-bold font-plex shrink-0 ${avgScore >= 70 ? 'text-green-500' : avgScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {avgScore}%
                                </span>
                            )}
                        </div>
                    )}

                    {/* Chat */}
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px', paddingBottom: '8px' }}>
                        {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
                        {busy && msgs.length > 0 && !msgs[msgs.length - 1]?.typing && (
                            <div className="flex gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 flex items-center justify-center text-xs font-bold">A</div>
                                <div className="bg-surface border border-border rounded-2xl rounded-tl-none px-4 py-3">
                                    <span className="flex gap-1">
                                        {[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay:`${d}ms`}} />)}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input Panel */}
                    {screen === 'interview' && showInput && (
                        <div className="bg-surface border border-border rounded-2xl p-4 mt-3 space-y-3">
                            {/* Toggle */}
                            <div className="flex gap-2">
                                {[['🎤 Voice', 'voice'], ['⌨ Type', 'text']].map(([label, val]) => (
                                    <button key={val} onClick={() => setInputMode(val)}
                                        className={`flex-1 py-2 text-xs font-bold font-plex rounded-xl border transition-all ${
                                            inputMode === val ? 'bg-accent/15 border-accent/50 text-accent' : 'border-border text-muted'
                                        }`}>{label}</button>
                                ))}
                            </div>

                            {/* Voice */}
                            {inputMode === 'voice' && (
                                <div className="space-y-2">
                                    <button
                                        onClick={listening ? stopListen : startListen}
                                        disabled={transcribing}
                                        className={`w-full py-3 rounded-xl font-bold font-plex text-sm flex items-center justify-center gap-2 transition-all ${
                                            listening ? 'bg-red-500 text-white shadow-red-500/20 shadow-lg'
                                            : 'bg-accent text-[#0f0e0d] hover:scale-[1.01] shadow-accent/20 shadow-lg'
                                        } ${transcribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {listening ? <><MicOff size={17}/> Stop Recording</>
                                            : transcribing ? <><Loader2 size={17} className="animate-spin"/> Transcribing...</>
                                            : <><Mic size={17}/> Tap to Speak</>}
                                    </button>

                                    {voiceText && (
                                        <div className="bg-bg border border-border rounded-xl px-4 py-3 text-sm font-plex text-text/90 italic min-h-[50px]">
                                            <span className="text-[10px] text-muted font-bold not-italic block mb-1">YOUR ANSWER:</span>
                                            "{voiceText}"
                                        </div>
                                    )}

                                    {voiceText && !listening && !transcribing && (
                                        <button onClick={submitAnswer}
                                            className="w-full py-3 rounded-xl font-bold font-plex text-sm bg-surface2 border border-accent text-accent hover:bg-accent hover:text-[#0f0e0d] transition-all flex items-center justify-center gap-2">
                                            <Check size={16}/> Submit Answer
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Text */}
                            {inputMode === 'text' && (
                                <div className="space-y-2">
                                    <textarea
                                        value={typedText}
                                        onChange={e => setTypedText(e.target.value)}
                                        placeholder="Type your answer here..."
                                        rows={3}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-plex text-text outline-none focus:border-accent resize-none"
                                    />
                                    <button onClick={submitAnswer} disabled={!typedText.trim()}
                                        className={`w-full py-3 rounded-xl font-bold font-plex text-sm flex items-center justify-center gap-2 transition-all ${
                                            typedText.trim() ? 'bg-accent text-[#0f0e0d] hover:scale-[1.01] shadow-lg shadow-accent/20' : 'bg-surface2 text-muted cursor-not-allowed border border-border'
                                        }`}>
                                        <Check size={16}/> Submit Answer
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {screen === 'done' && summary && (
                        <div className="bg-surface border border-border rounded-2xl p-5 mt-3 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className={`text-4xl font-black ${summary.overallScore >= 70 ? 'text-green-500' : summary.overallScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {summary.overallScore}%
                                </div>
                                <div>
                                    <p className="font-bold text-text" style={{ fontFamily: 'Playfair Display, serif' }}>Interview Complete</p>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {scores.map((s, i) => (
                                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded font-plex ${s>=70?'bg-green-500/15 text-green-500':s>=40?'bg-yellow-500/15 text-yellow-500':'bg-red-500/15 text-red-500'}`}>Q{i+1}: {s}%</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {summary.strengths?.length > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-2">✅ Strengths</p>
                                    {summary.strengths.map((s, i) => <p key={i} className="text-xs font-plex text-text">• {s}</p>)}
                                </div>
                            )}
                            {summary.improvements?.length > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-2">📈 To Improve</p>
                                    {summary.improvements.map((s, i) => <p key={i} className="text-xs font-plex text-text">• {s}</p>)}
                                </div>
                            )}
                            {summary.advice && (
                                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">🎯 Next Steps</p>
                                    <p className="text-xs font-plex text-text">{summary.advice}</p>
                                </div>
                            )}

                            <button onClick={() => { setScreen('setup'); setMsgs([]); setScores([]); setSummary(null); }}
                                className="w-full bg-accent text-[#0f0e0d] font-bold py-3.5 rounded-xl font-plex flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-accent/20">
                                <RefreshCcw size={16}/> Start New Interview
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
