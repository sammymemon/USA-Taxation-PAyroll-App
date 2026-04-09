import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Bot, CheckCircle, Loader2, Play, Settings, Sparkles, AlertCircle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_TOPICS = [
    "Advance Salary vs Loan",
    "Prepaid Expenses",
    "Accrued Revenue",
    "Depreciation (MACRS)",
    "Bad Debts (Allowance Method)",
    "Payroll Taxes (FICA, FUTA)"
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
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [topic, setTopic] = useState('');
    const [status, setStatus] = useState('idle'); // idle, generating, verifying, done, error
    const [lessonData, setLessonData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

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
            const generatePrompt = `You are a master USA Bookkeeping & Accounting tutor.
Teach the user about: "${activeTopic}"
Use the EXTREMELY simple "Hinglish" language (Hindi written in English alphabet, mixed with basic English).
Make the explanation engaging, detailed, but easy to understand for beginners.
Include 1 or 2 practical scenarios with their Journal Entries.

Return ONLY a JSON object exactly in this format:
{
  "title": "Topic Title",
  "explanation": "Detailed explanation paragraph in Hinglish",
  "scenarios": [
    {
      "description": "Scenario description in Hinglish",
      "entries": [
        { "account": "Cash", "type": "Debit", "amount": 1000 },
        { "account": "Sales Revenue", "type": "Credit", "amount": 1000 }
      ],
      "note": "Why this entry was made (Hinglish)"
    }
  ]
}`;
            
            const generatedRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output JSON.' },
                { role: 'user', content: generatePrompt }
            ], 1500, true);

            let intermediateData;
            try {
                intermediateData = JSON.parse(generatedRaw.match(/\{[\s\S]*\}/)[0]);
            } catch (e) {
                throw new Error("Failed to parse AI structure.");
            }

            // STEP 2: VERIFY DATA
            setStatus('verifying');
            const verifyPrompt = `You are a strict Senior CPA. I will give you a generated accounting lesson in JSON.
You must review EVERY journal entry.
Check if Debits strictly equal Credits for every scenario.
Check if the Account names make sense for USA Bookkeeping.
Check if the numbers make mathematical sense based on the description.

If there is ANY mistake, fix it directly in the data.
Output the EXACT SAME JSON structure with corrected data (if any). If it is already correct, just output it exactly as is.

JSON to review:
${JSON.stringify(intermediateData, null, 2)}`;

            const verifiedRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output corrected JSON.' },
                { role: 'user', content: verifyPrompt }
            ], 1500, true);

            const finalData = JSON.parse(verifiedRaw.match(/\{[\s\S]*\}/)[0]);
            setLessonData(finalData);
            setStatus('done');

        } catch (err) {
            console.error(err);
            setErrorMsg("Could not generate lesson. Please check your API key or try a different topic.");
            setStatus('error');
        }
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
                            
                            <h2 className="text-3xl md:text-4xl font-playfair font-black mb-4">What do you want to learn?</h2>
                            <p className="text-muted font-plex text-sm max-w-xl mx-auto mb-8">
                                Enter any USA accounting topic, rule, or journal entry. Aria (AI) will teach you in simple Hinglish, and internally double-check the journal entries for 100% accuracy.
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
                        
                        {!apiKey && (
                            <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-lg mt-8 text-center max-w-sm mx-auto">
                                <h5 className="font-plex text-sm text-text font-semibold mb-3 flex items-center justify-center gap-2">
                                    🔑 Groq API Key Required
                                </h5>
                                <input
                                    type="password"
                                    placeholder="gsk_xxxxxxxx..."
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        localStorage.setItem('groqApiKey', e.target.value.trim());
                                    }}
                                    className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-[13px] font-plex outline-none focus:border-accent text-center"
                                />
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
                                <div className="text-lg md:text-xl font-serif leading-relaxed text-text opacity-90 border-l-4 border-accent pl-5 py-2">
                                    {lessonData.explanation}
                                </div>
                            </div>

                            <div className="p-6 md:p-10 space-y-10">
                                {lessonData.scenarios?.map((scenario, sIdx) => {
                                    // Calculate totals for verification UI
                                    const totalDr = scenario.entries.filter(e => e.type.toLowerCase() === 'debit').reduce((s, e) => s + e.amount, 0);
                                    const totalCr = scenario.entries.filter(e => e.type.toLowerCase() === 'credit').reduce((s, e) => s + e.amount, 0);
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
                                                <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-surface2/50 border-b border-border hidden sm:table-header-group">
                                                            <tr className="font-plex text-[10px] uppercase text-muted tracking-widest">
                                                                <th className="px-4 py-3">Account</th>
                                                                <th className="px-4 py-3 text-right">Debit ($)</th>
                                                                <th className="px-4 py-3 text-right">Credit ($)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {scenario.entries.map((entry, eIdx) => {
                                                                const isDr = entry.type.toLowerCase() === 'debit';
                                                                return (
                                                                    <tr key={eIdx} className="font-plex text-sm sm:text-base">
                                                                        <td className={`px-4 py-3 ${isDr ? 'font-bold' : 'pl-10 text-muted'}`}>
                                                                            {entry.account}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-text">
                                                                            {isDr ? entry.amount.toLocaleString() : ''}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-muted">
                                                                            {!isDr ? entry.amount.toLocaleString() : ''}
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
