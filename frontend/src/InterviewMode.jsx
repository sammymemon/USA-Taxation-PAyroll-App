import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Mic, MicOff, ArrowLeft, Play, Pause, Bot, User,
    Loader2, RefreshCcw, Settings, X, Check, Volume2, Clock, BarChart2, Star,
    AlertCircle, Briefcase, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Groq helpers ────────────────────────────────────────────────────────────
async function callGroq(apiKey, messages, maxTokens = 800) {
    try {
        const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: maxTokens },
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        return res.data?.choices?.[0]?.message?.content || '';
    } catch (e) {
        console.error('Groq API error:', e?.response?.data || e.message);
        return null;
    }
}

// ─── Sound Effects (AudioContext for beeps) ─────────────────────────────────
const playTone = (frequency, type, duration) => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) { } // Ignore if blocked
};
const fxNext = () => playTone(800, 'sine', 0.2);
const fxStart = () => { playTone(440, 'sine', 0.1); setTimeout(() => playTone(660, 'sine', 0.2), 100); };
const fxEnd = () => { playTone(660, 'sine', 0.1); setTimeout(() => playTone(440, 'sine', 0.2), 100); };

// ─── Ringg Squirrel TTS (Free Indian Female Voice API) ───────────────────────
const RINGG_VOICE_ID = '83ba74e4-9efb-4db3-913a-f2a0ad66904d';
const RINGG_API_URL  = 'https://prod-api2.desivocal.com/dv/api/v0/tts_api/generate_squirrel';
let _ringgAudio = null;

async function ringgSpeak(text, onEnd) {
    try {
        ringgStop();
        const clean = text.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
        const chunk = clean.slice(0, 280);
        const res = await fetch(RINGG_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: chunk, voice_id: RINGG_VOICE_ID }),
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`Ringg API ${res.status}`);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        _ringgAudio = new Audio(url);
        _ringgAudio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
        _ringgAudio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
        _ringgAudio.play();
        return true;
    } catch { return false; }
}

function ringgStop() {
    if (_ringgAudio) { _ringgAudio.pause(); _ringgAudio.src = ''; _ringgAudio = null; }
}

function getIndianFemaleVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const prefer = ['priya', 'heera', 'raveena', 'aditi', 'veena', 'divya'];
    for (const name of prefer) {
        const v = voices.find(v => v.name.toLowerCase().includes(name));
        if (v) return v;
    }
    return voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

function browserTtsSpeak(text, onEnd) {
    try {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const clean = text.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
        const u = new SpeechSynthesisUtterance(clean);
        u.rate = 0.95; u.pitch = 1.1; u.lang = 'en-IN';
        const voice = getIndianFemaleVoice();
        if (voice) u.voice = voice;
        u.onend = () => onEnd?.();
        u.onerror = () => onEnd?.();
        window.speechSynthesis.speak(u);
    } catch { }
}

let _activeTtsSetter = null;
async function ttsSpeak(text, setTtsState) {
    if (_activeTtsSetter) _activeTtsSetter('idle');
    _activeTtsSetter = setTtsState;
    if (setTtsState) setTtsState('speaking');
    
    // Auto detect if it's feedback and slice correctly
    const playText = text.includes('Full Correct Answer:') 
        ? text.split('Full Correct Answer:')[1]?.split('🏢')[0]?.trim() || text 
        : text;

    const ok = await ringgSpeak(playText, () => {
        if (_activeTtsSetter === setTtsState && setTtsState) setTtsState('idle');
    });
    if (!ok) {
        browserTtsSpeak(playText, () => {
             if (_activeTtsSetter === setTtsState && setTtsState) setTtsState('idle');
        });
    }
}
function ttsStop() {
    ringgStop();
    try { window.speechSynthesis?.cancel(); } catch { }
    if (_activeTtsSetter) { _activeTtsSetter('idle'); _activeTtsSetter = null; }
}

// ─── Helper: Shuffle ────────────────────────────────────────────────────────
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// ─── Chat Bubble ─────────────────────────────────────────────────────────────
const Bubble = ({ msg }) => {
    const ai = msg.role === 'ai';
    const [tts, setTts] = useState('idle');

    useEffect(() => {
        if (msg.autoSpeak && msg.content && !msg.typing) {
            ttsSpeak(msg.content, setTts);
        }
    }, [msg.autoSpeak, msg.content, msg.typing]);

    const handleTTS = () => {
        if (tts === 'speaking') {
            if (_ringgAudio) _ringgAudio.pause();
            else window.speechSynthesis?.pause();
            setTts('paused');
        } else if (tts === 'paused') {
            if (_ringgAudio) _ringgAudio.play();
            else window.speechSynthesis?.resume();
            setTts('speaking');
        } else ttsSpeak(msg.content, setTts);
    };

    if (msg.type === 'system') {
        return (
            <div className="flex justify-center my-6">
                <span className="bg-bg border border-border px-5 py-2 rounded-full text-[10px] font-black text-muted uppercase tracking-[0.3em] font-plex shadow-sm">
                    {msg.content}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 mb-6 ${ai ? 'items-start' : 'flex-row-reverse items-start'} group animate-fadeIn`}>
            <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shadow-lg transition-transform group-hover:scale-105 ${
                ai ? 'bg-gradient-to-br from-accent/20 to-accent text-bg border border-accent/40'
                   : 'bg-gradient-to-br from-blue-500/20 to-blue-600 text-white border border-blue-500/40'
            }`}>
                {ai ? <Bot size={20}/> : <User size={20}/>}
            </div>
            <div className={`max-w-[85%] flex flex-col ${ai ? 'items-start' : 'items-end'}`}>
                <div className={`px-5 py-4 rounded-3xl text-[14px] md:text-[15px] leading-[1.6] relative shadow-xl ${
                    ai ? 'bg-surface border border-border text-text rounded-tl-none'
                       : 'bg-accent/10 border border-accent/40 text-text rounded-tr-none'
                }`}>
                    {msg.typing ? (
                        <div className="flex gap-2 items-center h-6">
                            {[0,150,300].map(d => (
                                <div key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{animationDelay:`${d}ms`}} />
                            ))}
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap font-serif tracking-wide">{msg.content}</div>
                    )}
                    
                    {msg.score != null && (
                        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-bg rounded-full overflow-hidden border border-border/50">
                                    <div className={`h-full transition-all duration-1000 ${msg.score >= 80 ? 'bg-green-500' : msg.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width:`${msg.score}%`}}/>
                                </div>
                                <span className={`text-xs font-black font-plex ${msg.score >= 80 ? 'text-green-500' : msg.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {msg.score}%
                                </span>
                            </div>
                            {msg.confidence && (
                                <div className="flex gap-0.5">
                                    {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= msg.confidence ? 'text-yellow-500' : 'text-muted/30'} fill={s <= msg.confidence ? 'currentColor' : 'none'}/>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {ai && !msg.typing && msg.content && (
                    <div className="mt-2 flex items-center gap-2">
                        <button onClick={handleTTS} className={`flex items-center gap-2 text-[10px] font-black font-plex transition-all px-4 py-1.5 rounded-full border shadow-sm active:scale-95 ${
                            tts !== 'idle' ? 'bg-accent/20 text-accent border-accent/40' : 'bg-surface border-border text-muted hover:text-accent hover:border-accent/60'
                        }`}>
                            {tts === 'speaking' ? <><Pause size={10}/> SPEAKING</> : tts === 'paused' ? <><Play size={10}/> RESUME</> : <><Volume2 size={10}/> REPLAY VOICE</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InterviewMode() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [keyInput, setKeyInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Data
    const [questions, setQuestions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false); // Default false for instant load

    // Options
    const [yourName, setYourName] = useState('');
    const [category, setCategory] = useState('All');
    const [difficulty, setDifficulty] = useState('Mixed');
    const [numQ, setNumQ] = useState(5);
    const [pastedQA, setPastedQA] = useState('');

    // State Machine: setup -> intro -> question -> evaluating -> feedback -> wrapup -> done
    const [screen, setScreen] = useState('setup');
    const [stage, setStage] = useState('Intro'); // Intro, Warm-up, Main, Wrap-up
    const [msgs, setMsgs] = useState([]);
    const [queue, setQueue] = useState([]);
    const [qIdx, setQIdx] = useState(0);
    const [scores, setScores] = useState([]);
    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState(null);

    // Timer & Confidence
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [confidence, setConfidence] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    // Voice/Text
    const [inputMode, setInputMode] = useState('voice');
    const [listening, setListening] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const [transcribing, setTranscribing] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [useWhisper, setUseWhisper] = useState(() => localStorage.getItem('useGroqAI') === 'true');

    // Live Voice Waveform simulation
    const [aiSpeaking, setAiSpeaking] = useState(false);

    // Hints
    const [hintLoading, setHintLoading] = useState(false);
    const [currentHint, setCurrentHint] = useState('');

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const srRef = useRef(null);
    const srFinalRef = useRef('');
    const bottomRef = useRef(null);
    const autoProceedRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    // Timer Interval
    useEffect(() => {
        let interval = null;
        if (timerActive) interval = setInterval(() => setTimeElapsed(t => t + 1), 1000);
        else clearInterval(interval);
        return () => clearInterval(interval);
    }, [timerActive]);

    // Track AI speaking state by hooking into tts
    useEffect(() => {
        const checkTts = setInterval(() => {
            setAiSpeaking(_activeTtsSetter !== null || !!window.speechSynthesis?.speaking);
        }, 300);
        return () => clearInterval(checkTts);
    }, []);

    useEffect(() => {
        const apply = (d) => { 
            const trickyQuestions = [
                { id: 't1', cat: 999, diff: 'advanced', q: "Pichhle mahine ki salary 5000 pay ki thi, ab is mahine employee ko 500 advance salary di hai. Iski journal entry batao.", a: "Advance Salary A/c ... Dr 500\nTo Cash/Bank A/c ... 500" },
                { id: 't2', cat: 999, diff: 'advanced', q: "Company ne employee ko 10,000 salary deni thi, jisme se 1,000 TDS deduct kiya aur 9,000 bank se pay kiya. Iski entry kya hogi?", a: "Salary Expense A/c ... Dr 10,000\nTo Bank A/c ... 9,000\nTo TDS Payable A/c ... 1,000" },
                { id: 't3', cat: 999, diff: 'advanced', q: "Rent 20,000 due tha, jisme se abhi sirf 15,000 cash me pay kiya hai. Journal entry kya banegi?", a: "Rent Expense A/c ... Dr 20,000\nTo Cash/Bank A/c ... 15,000\nTo Outstanding Rent A/c ... 5,000" },
                { id: 't4', cat: 999, diff: 'advanced', q: "Business owner ne apne personal use ke liye business bank account se 5,000 withdraw kiye. Iski journal entry batao.", a: "Drawings A/c ... Dr 5,000\nTo Bank A/c ... 5,000" },
                { id: 't5', cat: 999, diff: 'advanced', q: "Customer se 50,000 ka check receive hua jo bank me deposit kiya, par next day bounce ho gaya aur bank ne 500 penalty charge ki. Entry kya hogi?", a: "Jab check bounce hua, entry: Customer A/c ... Dr 50,500\nTo Bank A/c ... 50,500 (Note: The 500 penalty is reversed and charged to customer)" },
                { id: 't6', cat: 999, diff: 'advanced', q: "Plant & Machinery par saal bhar ka 10% depreciation lagana hai. Machinery ki value 1,00,000 hai. Entry batao.", a: "Depreciation A/c ... Dr 10,000\nTo Plant & Machinery A/c ... 10,000" }
            ];

            setQuestions([...trickyQuestions, ...(d.questions || [])]); 
            setCategories([{ id: 999, name: "Tricky Journal Entries (Hinglish)", short: "Tricky JE", color: "c1", tag: "tag1" }, ...(d.categories || [])]); 
            setCategory("Tricky Journal Entries (Hinglish)");
        };
        
        // Try local data.json first
        fetch('/data.json').then(r => r.json()).then(data => apply(data)).catch(console.error);
    }, []);


    // Browser Speech Rec
    useEffect(() => {
        if (!useWhisper && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            const sr = new SR();
            sr.continuous = true; sr.interimResults = true; sr.lang = 'en-US';
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

    // Helpers
    const addMsg = (role, content, extra = {}) => setMsgs(prev => [...prev, { role, content, ...extra }]);
    const addSystemMsg = (content) => setMsgs(prev => [...prev, { role: 'system', type: 'system', content }]);
    const addTyping = () => { const id = `t${Date.now()}`; setMsgs(prev => [...prev, { role: 'ai', content: '', typing: true, id }]); return id; };
    const resolveTyping = (id, content, extra = {}) => setMsgs(prev => prev.map(m => m.id === id ? { role: 'ai', content, ...extra } : m));

    const startListen = async () => {
        setVoiceText(''); srFinalRef.current = '';
        if (useWhisper) {
            if (!apiKey) return alert('API Key required for Whisper.');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                chunksRef.current = [];
                const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
                rec.onstop = () => { transcribeBlob(new Blob(chunksRef.current, { type: 'audio/webm' })); stream.getTracks().forEach(t => t.stop()); };
                rec.start(); recorderRef.current = rec; setListening(true);
            } catch { alert('Mic access denied.'); }
        } else { srRef.current?.start(); setListening(true); }
    };
    const stopListen = () => { useWhisper ? recorderRef.current?.stop() : srRef.current?.stop(); setListening(false); };
    const transcribeBlob = async (blob) => {
        setTranscribing(true);
        const fd = new FormData(); fd.append('file', new File([blob], 'audio.webm', { type: 'audio/webm' })); fd.append('model', 'whisper-large-v3-turbo');
        try { const r = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', fd, { headers: { Authorization: `Bearer ${apiKey}` } }); setVoiceText(r.data.text || ''); } 
        catch { setVoiceText('(Transcription failed)'); }
        setTranscribing(false);
    };

    // ── INTERVIEW FLOW ────────────────────────────────────────────────────────
    
    // 1. Kickoff
    const startInterview = async () => {
        let finalQueue = [];
        if (pastedQA.trim()) {
            try {
                const parseReq = await callGroq(apiKey, [
                    { role: 'system', content: 'Extract Q&A into JSON array: [{"q": "...", "a": "..."}]' },
                    { role: 'user', content: pastedQA }
                ], 3000);
                finalQueue = JSON.parse(parseReq.match(/\[[\s\S]*\]/)[0]);
            } catch(e) {
                setBusy(false);
                return alert("AI could not extract Q&A. Please check your text format.");
            }
        } else {
            let pool = category !== 'All' ? questions.filter(q => q.cat === categories.find(c=>c.name===category)?.id) : [...questions];
            if(!pool.length) pool = [...questions];
            // PROPER SHUFFLE BEFORE SLICE
            finalQueue = shuffleArray(pool).slice(0, numQ);
        }

        fxStart();
        setScreen('interview'); setStage('Intro'); setTimerActive(false);
        setScores([]); setTimeElapsed(0); setConfidence(0);
        setQueue(finalQueue); setQIdx(0); setMsgs([]);

        addSystemMsg('Interview Initiated');
        const tid = addTyping();
        const intro = await callGroq(apiKey, [
            { role: 'system', content: `You are Aria, an expert accounting recruiter. You are conducting a technical interview for ${yourName || 'a candidate'} focusing on Journal Entries. Welcome them professionally in simple Hinglish (Hindi + English). Be concise (1-2 sentences).` },
            { role: 'user', content: `Start the session.` }
        ], 150);
        
        resolveTyping(tid, intro || `Welcome ${yourName || ''}. I'm Aria, and we'll be starting your technical evaluation now. Ready?`, { autoSpeak: true });
        
        setBusy(false);
        autoProceedRef.current = setTimeout(() => askQuestion(finalQueue, 0, 'Warm-up'), 6000);
    };

    // 2. Ask Question
    const askQuestion = async (qList, idx, currentStage) => {
        clearTimeout(autoProceedRef.current);
        fxNext();
        setStage(currentStage);
        setQIdx(idx); setBusy(true); setTimerActive(false); setTimeElapsed(0); setConfidence(0);
        setCurrentHint('');
        addSystemMsg(`Stage: ${currentStage} - Q${idx + 1}/${qList.length}`);

        const tid = addTyping();
        const qData = qList[idx];

        let flavor = currentStage === 'Warm-up' ? "Ask gently, basic concepts." : 
                     idx === qList.length - 1 ? "Ask an advanced, tricky situation." : "Ask it as a real-world scenario.";

        const prompt = await callGroq(apiKey, [
            { role: 'system', content: `You are Aria, a serious Technical Interviewer. ${flavor} Be direct, sharp, professional. No pleasantries. Speak strictly in simple Hinglish (Hindi words written in English alphabet). Keep it conversational and easy to understand.` },
            { role: 'user', content: `Ignore any predefined question. Dynamically generate ONE brand new, tricky Journal Entry scenario/question for the candidate to solve (e.g., advance salary, check bounce, depreciation, bad debts, TDS). Ask the question directly in Hinglish.` }
        ], 150);

        const generatedText = prompt || qData.q;
        setQueue(prev => {
            const nextQueue = [...prev];
            nextQueue[idx] = { ...nextQueue[idx], askedQuestion: generatedText };
            return nextQueue;
        });

        resolveTyping(tid, generatedText, { autoSpeak: true });
        setBusy(false); setTimerActive(true);
    };

    // 3. Submit & Eval
    const submitAnswer = async () => {
        const ans = inputMode === 'voice' ? voiceText : typedText;
        if (!ans.trim() || confidence === 0) return alert('Provide an answer and select your confidence level!');
        
        ttsStop(); if (listening) stopListen();
        setTimerActive(false);
        addMsg('user', ans);
        setVoiceText(''); setTypedText(''); setBusy(true); setScreen('evaluating');

        const qData = queue[qIdx];
        const tid = addTyping();

        const evalReq = await callGroq(apiKey, [
            { role: 'system', content: `You are an expert accounting instructor and technical interviewer. Evaluate the candidate's journal entry answer. The candidate stated their confidence as ${confidence}/5. Time taken: ${timeElapsed}s.
If the candidate's answer aligns well with standard accounting principles, score them highly. 
CRITICAL RULE: If the candidate is wrong or misses key points, you MUST patiently TEACH them exactly where they went wrong, why it is wrong, and how to correct it step-by-step.

IMPORTANT: Provide the "feedback", "correct_answer", and "study_focus" strictly in easy Hinglish (Hindi mixed with English, written in English alphabet) so the user can learn easily. "key_strengths" and "critical_misses" should also be in Hinglish.

Return ONLY valid JSON:
{
  "score": <0-100>,
  "verdict": "<Correct / Flawed / Incorrect>",
  "feedback": "<1 paragraph evaluating their answer. If wrong, TEACH them their mistake clearly and step-by-step in Hinglish>",
  "key_strengths": ["point 1 in Hinglish"],
  "critical_misses": ["point 1 in Hinglish"],
  "correct_answer": "<Clear explanation of the correct journal entry, in Hinglish, 2 sentences>",
  "study_focus": "<What concept to study more, in Hinglish>"
}` },
            { role: 'user', content: `Question Asked: ${qData.askedQuestion || qData.q}\nCandidate Ans: ${ans}` }
        ], 800);

        let data = { score: 50, feedback: 'Error evaluating.', correct_answer: qData.a };
        try { data = JSON.parse(evalReq.match(/\{[\s\S]*\}/)[0]); } catch {}

        const finalScore = Math.max(0, Math.min(100, data.score));
        setScores(prev => [...prev, finalScore]);

        let feedbackText = `${data.verdict === 'Correct' ? '✅' : data.verdict === 'Flawed' ? '⚠️' : '❌'} EVALUATION:
${data.feedback}

✅ Key Strengths: ${data.key_strengths?.join(', ') || 'None'}
❌ Critical Misses: ${data.critical_misses?.join(', ') || 'None'}

📖 Full Correct Answer:
${data.correct_answer}

📚 Study Focus: ${data.study_focus || 'Review the core concepts.'}`;

        resolveTyping(tid, feedbackText, { autoSpeak: true, score: finalScore, confidence });
        setBusy(false); setScreen('feedback');

        // Prepare next round auto-advance
        if (qIdx + 1 < queue.length) {
            const nextStage = qIdx + 1 === queue.length - 1 ? 'Wrap-up' : 'Main';
            autoProceedRef.current = setTimeout(() => askQuestion(queue, qIdx + 1, nextStage), 12000); // 12s to read feedback
        } else {
            autoProceedRef.current = setTimeout(() => finishInterview(), 10000);
        }
    };

    // 4. Get a Hint
    const getHint = async () => {
        if (!apiKey || hintLoading || currentHint) return;
        setHintLoading(true);
        const qData = queue[qIdx];
        const hint = await callGroq(apiKey, [
            { role: 'system', content: 'You are a helpful interview coach. When given an interview question, provide a hint to the candidate on how to structure their answer. DO NOT write the actual answer. Instead, give them 2 to 3 bullet points on what topics or concepts they should cover in their answer. Start your response exactly with "To answer this question, consider the following points:" followed by bullet points.' },
            { role: 'user', content: `Question: ${qData.q}` }
        ], 200);
        setCurrentHint(hint || 'To answer this question, consider the following points:\n* Focus on the key concepts.\n* Give a practical example.');
        setHintLoading(false);
    };

    // 5. Finish
    const finishInterview = async () => {
        clearTimeout(autoProceedRef.current);
        ttsStop(); setBusy(true); setScreen('interview'); setStage('Wrap-up');
        fxEnd();

        const allScores = scores.length ? scores : [0];
        const avg = Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length);
        addSystemMsg('Interview Concluded');

        const tid = addTyping();
        const finishMsg = await callGroq(apiKey, [
            { role: 'system', content: 'You are Aria. Conclude the interview professionally based on their avg score.' },
            { role: 'user', content: `Candidate avg score: ${avg}%. Give 2 final sentences of feedback.` }
        ], 100);
        resolveTyping(tid, finishMsg || `Thank you for your time. Your final average score is ${avg}%. We will be in touch.`, { autoSpeak: true });

        // Generate Charts Summary
        const sumReq = await callGroq(apiKey, [
            { role: 'system', content: `Return JSON: {"strengths":["s1"],"weaknesses":["w1"],"hire_recommendation":"<Yes/No/Needs Review>","final_rating":"<Junior/Mid/Senior>"}` },
            { role: 'user', content: `Scores array: [${scores.join(', ')}]. Questions: ${queue.length}` }
        ], 200);
        
        try { setSummary({...JSON.parse(sumReq.match(/\{[\s\S]*\}/)[0]), overall: avg}); } 
        catch { setSummary({ overall: avg, strengths: [], weaknesses: [], hire_recommendation: 'Review', final_rating: 'Unknown' }); }
        
        setBusy(false);
        setTimeout(() => setScreen('done'), 5000);
    };

    const skipWait = () => {
        clearTimeout(autoProceedRef.current);
        if (qIdx + 1 < queue.length) askQuestion(queue, qIdx + 1, qIdx + 1 === queue.length - 1 ? 'Wrap-up' : 'Main');
        else finishInterview();
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
    if (loading) return <div className="h-screen flex items-center justify-center bg-bg"><Loader2 className="animate-spin text-accent" size={32}/></div>;

    return (
        <div className="fixed inset-0 bg-bg text-text flex flex-col font-inter selection:bg-accent/30 selection:text-accent overflow-hidden w-full max-w-full">
            {/* Nav */}
            <div className="bg-surface border-b border-border p-3 flex justify-between items-center shrink-0 z-50 shadow-sm">
                <Link to="/" className="p-2 border border-border rounded-xl text-muted hover:text-accent hover:border-accent/50 transition-colors"><ArrowLeft size={18}/></Link>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold tracking-wide flex items-center gap-2 text-sm"><Briefcase size={16} className="text-accent"/> Live Interview</h1>
                    {stage !== 'Intro' && screen !== 'setup' && screen !== 'done' && (
                        <div className="text-[10px] text-muted font-bold tracking-widest uppercase mt-0.5">{stage} Stage</div>
                    )}
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 border border-border rounded-xl text-muted hover:text-accent transition-colors"><Settings size={18}/></button>
            </div>

            {/* Content area */}
            <div className="flex-1 max-w-2xl w-full mx-auto p-3 flex flex-col overflow-hidden relative">

                {/* Settings Panel */}
                {showSettings && (
                    <div className="bg-surface border border-border rounded-2xl p-4 mb-4 shadow-xl">
                        <div className="flex justify-between items-center mb-4"><span className="font-bold text-sm">Settings</span><button onClick={()=>setShowSettings(false)} className="text-muted"><X size={16}/></button></div>
                        <label className="text-xs font-bold text-muted mb-1 block uppercase">Groq API Key</label>
                        <div className="flex gap-2">
                            <input type="password" value={keyInput||apiKey} onChange={e=>setKeyInput(e.target.value)} placeholder="gsk_..." className="flex-1 bg-bg border border-border p-2 rounded-lg text-sm focus:border-accent outline-none font-plex" />
                            <button onClick={()=>{setApiKey(keyInput||apiKey); localStorage.setItem('groqApiKey', keyInput||apiKey); setShowSettings(false);}} className="bg-accent text-[#0f0e0d] px-4 font-bold rounded-lg text-sm">Save</button>
                        </div>
                        <label className="text-xs font-bold text-muted mt-4 mb-1 block uppercase">Voice Engine</label>
                        <div className="flex gap-2">
                            {[['Browser', false], ['Groq Whisper', true]].map(([l,v]) => (
                                <button key={l} onClick={()=>{setUseWhisper(v); localStorage.setItem('useGroqAI', v);}} className={`px-3 py-2 text-xs font-bold rounded-lg border ${useWhisper===v?'bg-accent/20 border-accent text-accent':'border-border text-muted'} transition-all`}>{l}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Setup */}
                {screen === 'setup' && (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-6 px-2 animate-in fade-in zoom-in duration-500">
                        <div className="relative w-20 h-20 rounded-full shrink-0 bg-gradient-to-br from-surface to-bg border-4 border-surface shadow-xl flex items-center justify-center mb-4">
                            <div className="absolute inset-0 rounded-full border border-accent/30 animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
                            <Bot size={32} className="text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold mb-1 font-display text-center shrink-0">Ready for your Interview?</h2>
                        <p className="text-xs text-muted text-center mb-6 shrink-0">Set your parameters. Aria will conduct a full technical evaluation.</p>
                        
                        <div className="w-full max-w-sm space-y-4 bg-surface p-5 rounded-3xl border border-border shadow-md shrink-0 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Candidate Name</label>
                                <input placeholder="Enter name..." value={yourName} onChange={e=>setYourName(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:border-accent outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={pastedQA.trim() ? 'opacity-50 pointer-events-none' : ''}>
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Topic</label>
                                    <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:border-accent outline-none appearance-none">
                                        <option value="All">Mixed Topics</option>
                                        {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className={pastedQA.trim() ? 'opacity-50 pointer-events-none' : ''}>
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Questions</label>
                                    <select value={numQ} onChange={e=>setNumQ(Number(e.target.value))} className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:border-accent outline-none appearance-none">
                                        {[3,5,10,15].map(n=><option key={n} value={n}>{n} Questions</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1.5 flex justify-between">
                                    <span>Custom Q&A (Paste Here)</span>
                                    {pastedQA.trim() ? <span className="text-green-500 lowercase text-[9px]">(overrides settings)</span> : <span className="text-muted lowercase text-[9px]">(optional)</span>}
                                </label>
                                <textarea placeholder={"Q: What is React?\nA: A UI library.\n\nQ: What is JSX?\nA: A syntax extension for JS."} value={pastedQA} onChange={e=>setPastedQA(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-3 text-xs focus:border-accent outline-none h-24 resize-y font-plex placeholder:text-muted/50" />
                            </div>
                            <button onClick={startInterview} disabled={!apiKey} className="w-full mt-2 py-3.5 bg-accent text-[#0f0e0d] font-bold rounded-xl text-base hover:scale-[1.02] shadow-xl shadow-accent/20 transition-all flex justify-center items-center gap-2">
                                <Play size={18} fill="currentColor"/> Start Session
                            </button>
                            {!apiKey && <p className="text-xs text-red-400 text-center font-bold font-plex mt-2"><AlertCircle size={14} className="inline mr-1"/> API Key Required in Settings</p>}
                        </div>
                    </div>
                )}

                {/* Interview Interface */}
                {(screen === 'interview' || screen === 'evaluating' || screen === 'feedback') && (
                    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                        {/* Status Header */}
                        <div className="shrink-0 flex items-center justify-between mb-3 bg-surface/50 border border-border rounded-2xl p-3 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-yellow-400 flex items-center justify-center text-[#0f0e0d] shadow-lg ${aiSpeaking ? 'animate-pulse' : ''}`}>
                                        <Bot size={20} />
                                    </div>
                                    {aiSpeaking && <span className="absolute -inset-1 blur-sm rounded-full bg-accent/40 animate-ping -z-10"></span>}
                                </div>
                                <div>
                                    <div className="text-xs font-bold">Aria</div>
                                    <div className="text-[10px] text-accent font-plex flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> {aiSpeaking ? 'Speaking...' : 'Listening'}
                                    </div>
                                </div>
                            </div>
                            {/* Live Timer & Stats */}
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-muted">Time Elapsed</span>
                                    <span className={`text-lg font-plex font-bold ${timeElapsed > 60 ? 'text-red-400' : 'text-text'}`}>
                                        {Math.floor(timeElapsed/60).toString().padStart(2,'0')}:{(timeElapsed%60).toString().padStart(2,'0')}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-border"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-muted">Progress</span>
                                    <span className="text-sm font-bold">{qIdx+1}/{queue.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
                            <div ref={bottomRef} className="h-4"/>
                        </div>

                        {/* Input Area */}
                        <div className="shrink-0 pt-2 pb-1 relative z-10 w-full">
                            {screen === 'interview' && !busy && (
                                <div className="bg-surface border border-border shadow-md rounded-t-2xl sm:rounded-2xl p-3 animate-in slide-in-from-bottom duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex gap-2 bg-bg rounded-lg p-1 border border-border">
                                            <div className="px-4 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-md bg-surface border border-border shadow-sm text-text">
                                                <Mic size={14}/> Voice Mode (Required)
                                            </div>
                                        </div>
                                        <button 
                                            onClick={getHint} 
                                            disabled={hintLoading || !!currentHint}
                                            className={`text-xs font-bold font-plex flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentHint ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface text-muted border-border hover:text-text hover:bg-bg'}`}
                                        >
                                            {hintLoading ? <Loader2 size={12} className="animate-spin"/> : <AlertCircle size={12}/>}
                                            {currentHint ? 'Hint Provided' : 'Need an Idea?'}
                                        </button>
                                    </div>
                                    
                                    {currentHint && (
                                        <div className="mb-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-xl text-sm font-plex text-text/90 animate-in fade-in zoom-in relative">
                                            <button 
                                                onClick={() => setCurrentHint('')} 
                                                className="absolute top-2 right-2 p-1 text-accent/60 hover:text-accent hover:bg-accent/10 rounded-md transition-all"
                                                title="Close hint"
                                            >
                                                <X size={14} />
                                            </button>
                                            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 pr-6">💡 Suggested Approach</div>
                                            <div className="whitespace-pre-wrap">{currentHint}</div>
                                        </div>
                                    )}

                                    {inputMode === 'voice' ? (
                                        <div className="flex items-center gap-3">
                                            <button onClick={listening?stopListen:startListen} disabled={transcribing} 
                                                className={`p-4 rounded-full flex-shrink-0 transition-all ${listening ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/20' : 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'}`}>
                                                {transcribing ? <Loader2 size={24} className="animate-spin"/> : listening ? <MicOff size={24}/> : <Mic size={24}/>}
                                            </button>
                                            <div className="flex-1 text-sm font-plex text-muted bg-bg p-3 rounded-xl border border-border h-14 overflow-hidden overflow-ellipsis break-words">
                                                {voiceText || (listening ? 'Listening... speak clearly.' : 'Tap mic to answer')}
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea value={typedText} onChange={e=>setTypedText(e.target.value)} placeholder="Type your response like a real interview..." className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:border-accent outline-none resize-none h-20 font-plex" />
                                    )}

                                    {/* Confidence & Submit row */}
                                    <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted uppercase">Confidence:</span>
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(n => (
                                                    <button key={n} onClick={()=>setConfidence(n)} className={`p-1 rounded transition-colors ${confidence>=n?'text-yellow-500':'text-muted hover:text-yellow-500/50'}`}>
                                                        <Star size={18} fill={confidence>=n?"currentColor":"none"} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={submitAnswer} disabled={(inputMode==='voice'?!voiceText:!typedText)||confidence===0} className="px-5 py-2 bg-accent text-[#0f0e0d] font-bold rounded-xl text-sm hover:scale-[1.02] shadow-lg shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                            Submit <ArrowLeft size={14} className="rotate-180"/>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {screen === 'feedback' && (
                                <div className="bg-surface/90 border border-border shadow-md rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center animate-in slide-in-from-bottom w-full max-w-full">
                                    <div className="text-xs text-muted font-bold flex items-center justify-center gap-2 text-center"><Loader2 size={14} className="animate-spin"/> AI is waiting for you...</div>
                                    <button onClick={skipWait} className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-accent/10 border border-accent/20 text-accent font-bold text-sm rounded-xl hover:bg-accent/20 flex items-center justify-center gap-2 transition-all">
                                        Continue <ArrowLeft size={16} className="rotate-180"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Dashboard / Done */}
                {screen === 'done' && summary && (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-6 px-2 animate-in fade-in zoom-in duration-500">
                        <div className="w-full max-w-lg bg-surface border border-border p-5 sm:p-6 rounded-3xl shadow-xl shrink-0">
                            <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold font-display text-text">Interview Complete</h2>
                            <p className="text-sm text-muted">Here's your technical assessment report.</p>
                        </div>

                        <div className="flex items-center gap-6 p-5 bg-bg rounded-2xl border border-border mb-6">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface border-border"/>
                                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * summary.overall) / 100} className={`${summary.overall >= 80 ? 'text-green-500' : summary.overall >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`}/>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black">{summary.overall}%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div><div className="text-[10px] text-muted font-bold uppercase mb-1">Recommendation</div><div className="text-sm font-bold px-3 py-1 bg-surface border border-border inline-block rounded-lg">{summary.hire_recommendation}</div></div>
                                <div><div className="text-[10px] text-muted font-bold uppercase mb-1">Assessed Level</div><div className="text-sm font-bold text-accent px-3 py-1 bg-accent/10 border border-accent/20 inline-block rounded-lg">{summary.final_rating}</div></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-2xl">
                                <h3 className="text-xs font-bold text-green-500 uppercase mb-2 flex items-center gap-1"><Check size={14}/> Top Strengths</h3>
                                <ul className="text-xs space-y-2 text-text/80 list-disc ml-4">{summary.strengths?.map((s,i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl">
                                <h3 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1"><AlertCircle size={14}/> Weaknesses</h3>
                                <ul className="text-xs space-y-2 text-text/80 list-disc ml-4">{summary.weaknesses?.map((w,i) => <li key={i}>{w}</li>)}</ul>
                            </div>
                        </div>

                        <button onClick={()=>{setScreen('setup'); setMsgs([]); setScores([]);}} className="w-full py-3.5 bg-accent text-[#0f0e0d] font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                            <RefreshCcw size={16}/> Start New Session
                        </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
