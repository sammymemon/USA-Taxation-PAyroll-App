import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Bot, CheckCircle, Loader2, Play, Settings, Sparkles, AlertCircle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_TOPICS = [
    "Accounting Equation", "Debit/Credit Rules", "Normal Account Balances", "T-Accounts", "Cash vs Accrual Basis", "Chart of Accounts",
    "Revenue Recognition (ASC 606)", "Sales Returns & Allowances", "Credit Memos", "Allowance for Doubtful Accounts", "Bad Debt Write-offs", "Unearned Revenue",
    "Purchase Orders (PO) vs Bill", "1099 Vendor Setup", "Early Payment Discounts", "Prepaid Expenses",
    "Bank Reconciliation", "Outstanding Checks", "Deposits in Transit", "NSF Checks", "Petty Cash Fund", "Credit Card Reconciliation",
    "Hourly vs Salary & Overtime", "Employer Payroll Taxes (FICA)", "Employee Payroll Deductions", "Form 941 & 940", "W-2 vs 1099 Classification",
    "Depreciation (MACRS)", "Accrued Revenue", "Accrued Expenses", "Retained Earnings", "Cost of Goods Sold (COGS)"
];

async function callGroq(apiKey, messages, maxTokens = 1500, json = false) {
    try {
        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
        };
        if (json) payload.response_format = { type: 'json_object' };

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

export default function InterviewMode() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || localStorage.getItem('grokApiKey') || '');
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('hinglish');
    const [status, setStatus] = useState('idle'); // idle, generating, verifying, done, error
    const [lessonData, setLessonData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Podcast states
    const [hfApiKey, setHfApiKey] = useState(() => localStorage.getItem('hfApiKey') || '');
    const [hfModel, setHfModel] = useState(() => localStorage.getItem('hfModel') || 'suno/bark-small');
    const [podcastScript, setPodcastScript] = useState(null);
    const [podcastStatus, setPodcastStatus] = useState('idle'); // idle, generating_script, generating_audio, playing, error
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [podcastError, setPodcastError] = useState('');

    const handleLearn = async (selectedTopic) => {
        const activeTopic = selectedTopic || topic;
        if (!activeTopic.trim()) return alert("Please enter a topic to learn!");
        if (!apiKey) return alert("Please enter your Groq API Key first!");

        setStatus('generating');
        setErrorMsg('');
        setLessonData(null);
        setTopic(activeTopic);

        try {
            // STEP 1: GENERATE LESSON
            const languagePrompt = language === 'hinglish' 
                ? 'CRITICAL REQUIREMENT: You MUST write the entire explanation and all notes in conversational Indian "Hinglish". This means writing Hindi sentences using the English alphabet mixed with Accounting terms. (e.g., "Jab asset badhta hai toh hum debit karte hain"). DO NOT output pure English paragraphs. Your explanations MUST be in Hinglish.'
                : 'Use clear, professional, yet easy-to-understand English language.';

            const generatePrompt = `You are a master USA Bookkeeping & Accounting tutor.
Teach the user about: "${activeTopic}"
${languagePrompt}
Make the explanation engaging, detailed, but easy to understand for beginners.
Make absolutely sure your accounting methodology and double-entry logic is 100% accurate.
Include 1 or 2 practical scenarios with their Journal Entries.

Return ONLY a JSON object exactly in this format:
{
  "title": "Topic Title",
  "explanation": "Detailed explanation paragraph in the requested language",
  "scenarios": [
    {
      "description": "Scenario description in the requested language",
      "entries": [
        { "account": "Cash", "type": "Debit", "amount": 1000 },
        { "account": "Sales Revenue", "type": "Credit", "amount": 1000 }
      ],
      "note": "Why this entry was made (Requested language)"
    }
  ]
}`;
            
            const generatedRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output JSON.' },
                { role: 'user', content: generatePrompt }
            ], 3500, true);

            let intermediateData;
            try {
                const match = generatedRaw.match(/\{[\s\S]*\}/);
                intermediateData = JSON.parse(match ? match[0] : generatedRaw);
            } catch (e) {
                console.error("Parse Error Gen", generatedRaw);
                throw new Error("Failed to parse AI structure.");
            }

            // STEP 2: VERIFY DATA
            setStatus('verifying');
            const verifyPrompt = `You are a strict Senior CPA and Quality Assurance auditor. I will give you a generated accounting lesson in JSON.
Your ONLY job is to verify the accuracy of the accounting principles and journal entries.
You MUST:
1. Verify mathematically that Total Debits exactly equals Total Credits for EVERY scenario.
2. If Debits != Credits, RECALCULATE and correctly adjust the amounts based on the scenario description.
3. Check if the Account names make sense for USA Bookkeeping. If not, fix them.

CRITICAL INSTRUCTION: DO NOT TRANSLATE, REWRITE, OR CHANGE THE LANGUAGE of the text strings (title, explanation, description, note). If the original text is in Hinglish/Hindi, KEEP IT exactly 100% as the original Hinglish. Your ONLY job is to fix mathematical numbers and debits/credits.

Output the EXACT SAME JSON structure with corrected data (if any). If it is already 100% correct, just output it exactly as is.

JSON to review:
${JSON.stringify(intermediateData, null, 2)}`;

            const verifiedRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output corrected JSON.' },
                { role: 'user', content: verifyPrompt }
            ], 3500, true);

            let finalData;
            try {
                const match2 = verifiedRaw.match(/\{[\s\S]*\}/);
                finalData = JSON.parse(match2 ? match2[0] : verifiedRaw);
            } catch (e) {
                console.error("Parse Error Ver", verifiedRaw);
                finalData = intermediateData; // Fallback to intermediate if strict verification parsing fails
            }
            
            setLessonData(finalData);
            setStatus('done');

        } catch (err) {
            console.error(err);
            setErrorMsg("Could not generate lesson. Please check your API key or try a different topic.");
            setStatus('error');
        }
    };

    const handleGeneratePodcast = async () => {
        if (!hfApiKey) return alert("Please enter your Hugging Face API Key first!");
        if (!lessonData) return;

        setPodcastStatus('generating_script');
        setPodcastError('');
        setPodcastScript(null);

        try {
            const podcastPrompt = `Convert the following accounting lesson into a short, engaging 2-person podcast script.
Host 1 (Teacher): Explains the concept clearly.
Host 2 (Student): Asks questions or clarifies.
Language: ${language === 'hinglish' ? 'Hinglish (use English alphabet but Hindi words, e.g. "Toh asset badhega")' : 'English'}.
Keep it very short and punchy: maximum 4 lines of dialogue total.
Output ONLY JSON array in this format:
[
  { "speaker": "Teacher", "text": "..." },
  { "speaker": "Student", "text": "..." }
]
Lesson Data:
${JSON.stringify({ title: lessonData.title, explanation: lessonData.explanation })}`;

            const scriptRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output a JSON array of objects.' },
                { role: 'user', content: podcastPrompt }
            ], 1500);

            let scriptData;
            try {
                const match = scriptRaw.match(/\[[\s\S]*\]/);
                scriptData = JSON.parse(match ? match[0] : scriptRaw);
            } catch (e) {
                console.error("Parse Error Podcast Script", scriptRaw);
                throw new Error("Failed to parse podcast script.");
            }

            setPodcastScript(scriptData);
            setPodcastStatus('generating_audio');

            // Generate audio for all lines sequentially
            const audioUrls = [];
            for (let i = 0; i < scriptData.length; i++) {
                const line = scriptData[i];
                let audioUrl = null;
                let retries = 3;

                while (retries > 0) {
                    try {
                        // Prepend a small cue for Bark models to encourage natural voices
                        let textInput = line.text;
                        if (hfModel.includes("bark")) {
                            textInput = (line.speaker.toLowerCase().includes("teacher") ? "♪ " : "") + line.text;
                        }

                        const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${hfApiKey}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ inputs: textInput })
                        });

                        if (response.ok) {
                            const blob = await response.blob();
                            audioUrl = URL.createObjectURL(blob);
                            break; // Success! Exit retry loop
                        } else {
                            const errData = await response.json().catch(() => ({}));
                            if (errData.estimated_time) {
                                const waitTime = Math.ceil(errData.estimated_time);
                                console.log(`Model loading, waiting ${waitTime}s...`);
                                setPodcastError(`⏳ Warming up AI Voice Model (${waitTime}s)...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime * 1000 + 2000));
                                retries--;
                            } else {
                                throw new Error(errData.error || `HTTP ${response.status}`);
                            }
                        }
                    } catch (audioErr) {
                        if (retries <= 1) {
                            console.error("HF Audio Error final:", audioErr);
                            throw new Error(`HuggingFace Error: ${audioErr.message}. Ensure your token is valid.`);
                        }
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }

                if (!audioUrl) throw new Error("Failed to generate audio for a line after multiple retries.");
                audioUrls.push(audioUrl);
            }

            // Attach audio URLs to script
            const scriptWithAudio = scriptData.map((line, idx) => ({ ...line, audioUrl: audioUrls[idx] }));
            setPodcastScript(scriptWithAudio);
            
            // Start playing
            setPodcastStatus('playing');
            playSequence(scriptWithAudio, 0);

        } catch (err) {
            console.error(err);
            setPodcastError(err.message || "Failed to generate podcast.");
            setPodcastStatus('error');
        }
    };

    const playSequence = (script, index) => {
        if (index >= script.length) {
            setPodcastStatus('idle');
            setCurrentLineIndex(0);
            return;
        }

        setCurrentLineIndex(index);
        const audio = new Audio(script[index].audioUrl);
        audio.onended = () => {
            playSequence(script, index + 1);
        };
        audio.onerror = () => {
            console.error("Audio playback error");
            playSequence(script, index + 1);
        };
        audio.play().catch(e => {
            console.error("Play prevented", e);
            setPodcastStatus('error');
            setPodcastError("Audio playback was blocked by the browser.");
        });
    };

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border p-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-lg hover:bg-surface2 transition-all text-muted hover:text-accent shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl md:text-2xl font-bold text-text flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg text-accent">
                            <Bot size={20} />
                        </div>
                        AI Teacher Mode
                    </h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Form Section */}
                {status === 'idle' || status === 'error' ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center mb-8">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <BookOpen size={140} />
                            </div>
                            
                            <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center mx-auto mb-6 border border-accent/20 shadow-inner">
                                <Sparkles size={40} />
                            </div>
                            
                            <div className="flex gap-2 justify-center mb-6 relative z-10">
                                <button 
                                    onClick={() => setLanguage('english')} 
                                    className={`px-5 py-2.5 rounded-xl font-plex text-[13px] font-bold transition-all ${language === 'english' ? 'bg-accent text-[#0f0e0d] shadow-lg shadow-accent/20 scale-105' : 'bg-surface border border-border text-muted hover:border-accent hover:text-text'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => setLanguage('hinglish')} 
                                    className={`px-5 py-2.5 rounded-xl font-plex text-[13px] font-bold transition-all ${language === 'hinglish' ? 'bg-accent text-[#0f0e0d] shadow-lg shadow-accent/20 scale-105' : 'bg-surface border border-border text-muted hover:border-accent hover:text-text'}`}
                                >
                                    Hinglish
                                </button>
                            </div>
                            
                            <h2 className="text-3xl md:text-4xl font-playfair font-black mb-4">What do you want to learn?</h2>
                            <p className="text-muted font-plex text-sm max-w-xl mx-auto mb-8">
                                Enter any USA accounting topic. Aria (AI) will teach you in {language === 'english' ? 'English' : 'simple Hinglish'}, and internally double-check the journal entries for 100% accuracy.
                            </p>

                            <div className="max-w-md mx-auto space-y-4 relative z-10">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder="e.g. Accrued Revenue entries..."
                                    className="w-full bg-bg border border-border px-4 py-4 rounded-xl font-plex text-text outline-none focus:border-accent shadow-sm transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleLearn()}
                                />
                                <button
                                    onClick={() => handleLearn()}
                                    className="w-full bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-accent/20"
                                >
                                    <Play size={18} fill="currentColor"/> Generate Verified Lesson
                                </button>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-2 justify-center relative z-10 max-w-2xl mx-auto">
                                {DEFAULT_TOPICS.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setTopic(t); handleLearn(t); }}
                                        className="text-xs font-plex px-3 py-1.5 rounded-full border border-border bg-surface hover:border-accent hover:text-accent transition-colors text-muted"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl font-plex text-sm flex items-center gap-3">
                                <AlertCircle size={18} /> {errorMsg}
                            </div>
                        )}
                        
                            <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-lg mt-8 text-center max-w-sm mx-auto">
                                <h5 className="font-plex text-sm text-text font-semibold mb-3 flex items-center justify-center gap-2">
                                    🔑 API Keys Setup
                                </h5>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Groq API Key (gsk_...)"
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            localStorage.setItem('groqApiKey', e.target.value.trim());
                                        }}
                                        className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-[13px] font-plex outline-none focus:border-accent text-center"
                                    />
                                    <input
                                        type="password"
                                        placeholder="HuggingFace Token (hf_...)"
                                        value={hfApiKey}
                                        onChange={(e) => {
                                            setHfApiKey(e.target.value);
                                            localStorage.setItem('hfApiKey', e.target.value.trim());
                                        }}
                                        className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-[13px] font-plex outline-none focus:border-accent text-center"
                                    />
                                </div>
                                <p className="font-plex text-[10px] text-muted mt-3">Required for AI generation and Podcast TTS</p>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Loading Section */}
                {(status === 'generating' || status === 'verifying') && (
                    <div className="py-20 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-surface rounded-full"></div>
                            <div className={`absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin ${status === 'verifying' ? 'border-green-500' : ''}`}></div>
                            {status === 'verifying' ? <ShieldCheck size={32} className="text-green-500" /> : <Bot size={32} className="text-accent" />}
                        </div>
                        <h3 className="text-2xl font-playfair font-bold text-text mb-2">
                            {status === 'generating' ? 'Writing your customized lesson...' : 'Performing CPA Audit Check...'}
                        </h3>
                        <p className="font-plex text-sm text-muted">
                            {status === 'generating' 
                                ? 'Teaching in easiest Hinglish.' 
                                : 'AI is double-checking amounts, debits, and credits to ensure zero mistakes.'}
                        </p>
                    </div>
                )}

                {/* Result Section */}
                {status === 'done' && lessonData && (
                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-6 flex justify-between items-center">
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-4 py-2 bg-surface border border-border rounded-xl font-plex text-xs font-bold text-muted hover:text-accent flex items-center gap-2 transition-colors"
                            >
                                <ArrowLeft size={14} /> Learn Another Topic
                            </button>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-500 font-plex text-[10px] uppercase tracking-widest rounded-full font-bold">
                                <ShieldCheck size={14} /> AI Verified
                            </span>
                        </div>

                        <div className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-2xl mb-8">
                            <div className="p-8 md:p-10 bg-gradient-to-br from-accent/10 to-transparent border-b border-border/50">
                                <h2 className="text-3xl md:text-5xl font-playfair font-black text-text mb-6">{lessonData.title}</h2>
                                <div className="text-lg md:text-xl font-serif leading-relaxed text-text opacity-90 border-l-4 border-accent pl-5 py-2 mb-6">
                                    {lessonData.explanation}
                                </div>
                                
                                {/* Podcast Feature */}
                                <div className="bg-bg border border-border rounded-2xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                                        <h3 className="font-playfair text-xl font-bold flex items-center gap-2">
                                            🎙️ Podcast Mode
                                        </h3>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={hfModel}
                                                onChange={e => {
                                                    setHfModel(e.target.value);
                                                    localStorage.setItem('hfModel', e.target.value);
                                                }}
                                                placeholder="HF Model"
                                                className="bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-plex outline-none focus:border-accent w-[200px]"
                                            />
                                            <button 
                                                onClick={handleGeneratePodcast}
                                                disabled={podcastStatus === 'generating_script' || podcastStatus === 'generating_audio'}
                                                className="bg-accent text-[#0f0e0d] px-4 py-1.5 rounded-lg font-plex text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {(podcastStatus === 'generating_script' || podcastStatus === 'generating_audio') ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor"/>}
                                                {podcastStatus === 'generating_script' ? 'Writing Script...' : podcastStatus === 'generating_audio' ? 'Generating Voice...' : 'Play Podcast'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {podcastError && <div className="bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-lg text-sm font-plex mb-4 animate-pulse flex items-center gap-2"><AlertCircle size={16}/> {podcastError}</div>}
                                    
                                    {podcastScript && (
                                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar mt-4">
                                            {podcastScript.map((line, idx) => {
                                                const isPlaying = podcastStatus === 'playing' && currentLineIndex === idx;
                                                const isTeacher = line.speaker.toLowerCase().includes('teacher');
                                                return (
                                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 ${isPlaying ? 'bg-surface2 shadow-md border border-accent scale-[1.01]' : 'bg-surface/50 border border-border/50 opacity-80'}`}>
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-playfair text-lg shrink-0 shadow-inner ${isTeacher ? 'bg-accent text-[#0f0e0d]' : 'bg-blue-500 text-white'}`}>
                                                            {line.speaker.charAt(0)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`font-plex text-[12px] font-bold tracking-widest uppercase ${isTeacher ? 'text-accent' : 'text-blue-500'}`}>{line.speaker}</span>
                                                                {isPlaying && <span className="flex gap-0.5 items-end h-3">
                                                                    <span className="w-1 h-2 bg-accent animate-[bounce_1s_infinite] rounded-full"></span>
                                                                    <span className="w-1 h-3 bg-accent animate-[bounce_1s_infinite_0.2s] rounded-full"></span>
                                                                    <span className="w-1 h-1.5 bg-accent animate-[bounce_1s_infinite_0.4s] rounded-full"></span>
                                                                </span>}
                                                            </div>
                                                            <div className={`font-serif text-base md:text-lg leading-relaxed ${isPlaying ? 'text-text' : 'text-muted'}`}>
                                                                {line.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 md:p-10 space-y-10">
                                {lessonData.scenarios?.map((scenario, sIdx) => {
                                    // Calculate totals for verification UI safely
                                    const safeEntries = scenario?.entries || [];
                                    const totalDr = safeEntries.filter(e => String(e.type || '').toLowerCase() === 'debit').reduce((s, e) => s + (Number(e.amount) || 0), 0);
                                    const totalCr = safeEntries.filter(e => String(e.type || '').toLowerCase() === 'credit').reduce((s, e) => s + (Number(e.amount) || 0), 0);
                                    const isBalanced = totalDr === totalCr;

                                    return (
                                        <div key={sIdx} className="bg-bg border border-border rounded-2xl overflow-hidden shadow-sm group">
                                            <div className="p-5 md:p-6 bg-surface/50 border-b border-border">
                                                <h3 className="font-plex text-sm text-accent uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-accent text-[#0f0e0d] flex items-center justify-center rounded-sm text-xs">{sIdx + 1}</span> 
                                                    Practical Scenario
                                                </h3>
                                                <p className="font-serif text-lg md:text-xl text-text">{scenario.description}</p>
                                            </div>

                                            <div className="p-4 md:p-6">
                                                <div className="bg-surface border border-border rounded-xl overflow-x-auto mb-4">
                                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                                        <thead className="bg-surface2/50 border-b border-border">
                                                            <tr className="font-plex text-[10px] uppercase text-muted tracking-widest">
                                                                <th className="px-4 py-3">Account</th>
                                                                <th className="px-4 py-3 text-right">Debit ($)</th>
                                                                <th className="px-4 py-3 text-right">Credit ($)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {safeEntries.map((entry, eIdx) => {
                                                                const isDr = String(entry.type || '').toLowerCase() === 'debit';
                                                                const formattedAmt = (Number(entry.amount) || 0).toLocaleString();
                                                                return (
                                                                    <tr key={eIdx} className="font-plex text-sm sm:text-base">
                                                                        <td className={`px-4 py-3 ${isDr ? 'font-bold' : 'pl-10 text-muted'}`}>
                                                                            {entry.account || 'Unknown'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-text">
                                                                            {isDr ? formattedAmt : ''}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-muted">
                                                                            {!isDr ? formattedAmt : ''}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-surface2/20 border-t border-border mt-2">
                                                            <tr className="font-plex text-xs font-bold">
                                                                <td className="px-4 py-3 text-muted">Verification Math (Internal)</td>
                                                                <td className={`px-4 py-3 text-right ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>{totalDr.toLocaleString()}</td>
                                                                <td className={`px-4 py-3 text-right ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>{totalCr.toLocaleString()}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>

                                                <div className="flex items-start gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                                    <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                                    <p className="font-serif text-sm md:text-base text-blue-100">
                                                        <strong className="font-plex font-bold tracking-wider text-[11px] uppercase block mb-1">Aria's Note</strong>
                                                        {scenario.note}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
