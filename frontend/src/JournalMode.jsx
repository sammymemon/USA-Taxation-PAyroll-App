import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, 
    Activity, Sparkles, BookOpen, Target, Brain, 
    Coins, ArrowRightLeft, PieChart, BarChart3, Wallet,
    CheckCircle2, AlertCircle, Loader2, Trophy,
    Heart, Scale, Star, ChevronRight, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

function JournalMode() {
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());
    const [gameStatus, setGameStatus] = useState('idle'); // idle, generating, playing, feedback
    const [scenario, setScenario] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { [accountName]: 'Debit' | 'Credit' }
    const [isGenerating, setIsGenerating] = useState(false);
    const [score, setScore] = useState(0);

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setUserAnswers({});
        setScore(0);

        const customPrompt = `Generate a TRICKY accounting interview question. 
        
CRITICAL: The "scenario" description must be in HINGLISH (Hindi mixed with English). 

Base logic for the scenario:
"A company, XYZ Inc., purchases a new machine form a vendor for $120,000 USD, paying $20,000 USD as a down payment, with the remaining $100,000 USD to be paid in 6 months at an interest rate of 10%. However, the vendor offers a 5% discount if the full amount is paid immediately. XYZ Inc. decides to take the discount and pays the full amount of $114,000 USD immediately."

Requirements:
- Translate the story into smooth, easy-to-read Hinglish.
- Accounts: Machine, Cash.
- Solution: Exact Dr/Cr sides.
- Logic: Hinglish explanation for the final analysis.

Output ONLY JSON:
{
  "scenario": "XYZ Inc. ne ek vendor se nayi machine kharidi $120,000 USD mein. $20,000 down payment di aur baaki $100,000 par 10% interest... (continue in Hinglish)",
  "accountsInvolved": ["Machine / Equipment", "Cash"],
  "correctEntries": [ { "account": "Machine / Equipment", "side": "Debit", "amount": 114000 }, { "account": "Cash", "side": "Credit", "amount": 114000 } ],
  "hinglishExplanation": "Yahan machine cost principle ke according net price ($114,000) par record hogi kyuki discount immediate cash payment par mila hai..."
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: customPrompt }],
                    temperature: 0.1,
                    max_tokens: 2000,
                    response_format: { type: "json_object" }
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );

            const parsed = JSON.parse(response.data.choices[0].message.content);
            setScenario(parsed);
            setGameStatus('playing');
        } catch (error) {
            console.error(error);
            alert("Connection error. Check API key.");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelection = (account, side) => {
        setUserAnswers({ ...userAnswers, [account]: side });
    };

    const submitBattle = () => {
        if (Object.keys(userAnswers).length < scenario.accountsInvolved.length) {
            return alert("Har account ke liye side (Dr/Cr) select karein!");
        }
        setGameStatus('feedback');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent/30 overflow-x-hidden">
            {/* Glossy Header */}
            <header className="p-4 md:p-6 flex justify-between items-center bg-black/80 backdrop-blur-3xl sticky top-0 z-[100] border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/10 group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent font-black uppercase tracking-[0.4em]">Hinglish Battle</span>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase">Mission Ground</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    <div className="flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-2xl border border-accent/20 transition-all hover:bg-accent/30">
                        <Zap size={18} className="text-accent fill-accent" />
                        <span className="font-black text-accent text-xs">VIBE CHECK</span>
                    </div>
                     <input 
                        type="password" 
                        placeholder="GROQ KEY"
                        value={groqApiKey}
                        onChange={(e) => {
                            setGroqApiKey(e.target.value);
                            localStorage.setItem('groqApiKey', e.target.value);
                        }}
                        className="hidden md:block bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[8px] w-32 focus:border-accent outline-none text-center"
                    />
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
                
                {/* IDLE SCREEN */}
                {gameStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-fadeIn">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 blur-[150px] rounded-full"></div>
                            <Trophy size={160} className="text-white opacity-10" />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-none italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10">
                                HINGLISH <br/> MISSIONS
                            </h2>
                            <p className="text-gray-500 text-lg md:text-2xl max-w-2xl mx-auto font-medium">
                                Ab accounting missions samjho apni language mein. Solve tricky cases and rank up.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-accent text-black font-black px-16 py-8 rounded-[2.5rem] text-4xl hover:scale-105 transition-all shadow-[0_30px_90px_rgba(var(--accent-rgb),0.3)]"
                        >
                            START MISSION
                        </button>
                    </div>
                )}

                {/* GENERATING */}
                {gameStatus === 'generating' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12">
                        <div className="relative">
                            <Loader2 size={120} className="text-accent animate-spin" />
                            <Star size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                        </div>
                        <h3 className="text-3xl font-black tracking-widest text-accent uppercase italic animate-pulse">Story Translate ho rahi hai...</h3>
                    </div>
                )}

                {/* PLAYING - GRID VIEW */}
                {gameStatus === 'playing' && scenario && (
                    <div className="space-y-12 animate-fadeIn pb-32">
                        
                        {/* THE SCENARIO HEADER (PREMIUM HINGLISH) */}
                        <div className="bg-[#0a0a0a] border-2 border-white/5 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                            <div className="absolute -top-10 -right-10 p-10 opacity-5 group-hover:rotate-6 transition-transform">
                                <BookOpen size={240} />
                            </div>
                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className="bg-accent/20 p-3 rounded-2xl text-accent border border-accent/20">
                                    <Target size={28} />
                                </div>
                                <span className="font-black text-xs uppercase tracking-[0.5em] text-accent">Mission Scenario (Hinglish)</span>
                            </div>
                            <p className="text-2xl md:text-4xl font-bold leading-tight text-white relative z-10 font-serif drop-shadow-md">
                                "{scenario.scenario}"
                            </p>
                        </div>

                        {/* Multi T-Account Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            {scenario.accountsInvolved.map((acc, index) => (
                                <div key={index} className="bg-[#111] border border-white/10 rounded-[3rem] p-6 md:p-8 space-y-6 hover:border-accent/40 transition-all shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col items-center transform hover:-translate-y-2">
                                    <h3 className="text-xl md:text-2xl font-black uppercase text-gray-400 italic text-center w-full truncate border-b border-white/5 pb-4">
                                        {acc}
                                    </h3>
                                    
                                    <div className="w-full relative px-2 md:px-4 py-4">
                                        <div className="w-full h-1 bg-white/20 rounded-full mb-8"></div>
                                        <div className="absolute left-1/2 top-4 bottom-0 w-1 bg-white/20 -translate-x-1/2 rounded-full"></div>

                                        <div className="grid grid-cols-2 gap-4 md:gap-8">
                                            {/* DEBIT PAD */}
                                            <button 
                                                onClick={() => handleSelection(acc, 'Debit')}
                                                className={`h-48 md:h-64 rounded-[2.5rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden group
                                                    ${userAnswers[acc] === 'Debit' ? 'bg-accent border-accent text-black scale-105' : 'bg-white/5 border-dashed border-white/10 hover:border-white/40 text-white/30'}`}
                                            >
                                                <span className="text-5xl md:text-7xl font-black italic">DR</span>
                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest mt-4">{userAnswers[acc] === 'Debit' ? 'LOCKED' : 'DEBIT'}</span>
                                            </button>

                                            {/* CREDIT PAD */}
                                            <button 
                                                onClick={() => handleSelection(acc, 'Credit')}
                                                className={`h-48 md:h-64 rounded-[2.5rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden group
                                                    ${userAnswers[acc] === 'Credit' ? 'bg-[#ef4444] border-[#ef4444] text-white scale-105' : 'bg-white/5 border-dashed border-white/10 hover:border-white/40 text-white/30'}`}
                                            >
                                                <span className="text-5xl md:text-7xl font-black italic">CR</span>
                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest mt-4">{userAnswers[acc] === 'Credit' ? 'LOCKED' : 'CREDIT'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center pt-8">
                            <button 
                                onClick={submitBattle}
                                className="w-full md:w-auto bg-white text-black font-black px-24 py-8 rounded-full text-3xl md:text-4xl hover:bg-accent hover:scale-105 transition-all shadow-[0_30px_80px_rgba(255,255,255,0.1)] flex items-center justify-center gap-6"
                            >
                                MISSION EVALUATE <ChevronRight size={48} />
                            </button>
                        </div>

                    </div>
                )}

                {/* FEEDBACK SCREEN */}
                {gameStatus === 'feedback' && scenario && (
                    <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-32">
                        <div className="text-center space-y-6">
                            <div className="inline-block p-8 bg-accent/10 rounded-full border border-accent/20 mb-4">
                                <Zap size={80} className="text-accent animate-pulse fill-accent" />
                            </div>
                            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter">Mission Logic Report</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                            <div className="bg-[#111] p-8 md:p-12 rounded-[4rem] border border-white/5 space-y-10">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-6">Your Performance</h3>
                                <div className="space-y-8">
                                    {scenario.accountsInvolved.map((acc, i) => {
                                        const correct = scenario.correctEntries.find(e => e.account === acc);
                                        const isCorrect = userAnswers[acc] === correct?.side;
                                        
                                        return (
                                            <div key={i} className={`flex justify-between items-center p-8 rounded-[2.5rem] border-2 transition-all ${isCorrect ? 'bg-accent/5 border-accent/20 shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl md:text-3xl font-black uppercase text-white/80">{acc}</span>
                                                    <span className={`text-xs font-black mt-2 uppercase ${userAnswers[acc] === 'Debit' ? 'text-accent' : 'text-[#ef4444]'}`}>SELECTED: {userAnswers[acc]}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    {isCorrect ? <CheckCircle2 size={48} className="text-accent" /> : <AlertCircle size={48} className="text-red-500" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#0c0c0c] to-black p-10 md:p-16 rounded-[4rem] border-2 border-accent/40 flex flex-col justify-center relative overflow-hidden group">
                                <Brain size={250} className="absolute -bottom-20 -right-20 opacity-5 group-hover:scale-110 transition-transform duration-700 hover:rotate-6" />
                                <div className="space-y-10 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <Sparkles size={48} className="text-accent" />
                                        <h4 className="text-4xl font-black italic leading-none">THE LOGIC <br/> (HINGLISH)</h4>
                                    </div>
                                    <p className="text-2xl md:text-4xl text-gray-100 leading-tight font-bold">
                                         {scenario.hinglishExplanation}
                                    </p>
                                    <div className="pt-8 border-t border-white/10 space-y-4">
                                        <p className="text-accent font-black text-sm uppercase tracking-widest">Correct Solution Table:</p>
                                        {scenario.correctEntries.map((e, idx) => (
                                            <div key={idx} className="flex justify-between font-mono text-lg text-white/50 border-b border-white/5 pb-2">
                                                <span>{e.account}</span>
                                                <span className={e.side === 'Debit' ? 'text-accent' : 'text-red-500'}>{e.side}: ${e.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-white text-black font-black w-full py-10 rounded-[2.5rem] text-4xl hover:bg-accent transition-all shadow-[0_40px_100px_rgba(255,255,255,0.1)] flex justify-center items-center gap-6"
                        >
                            <RefreshCcw size={48} /> NEW BATTLE
                        </button>
                    </div>
                )}

            </main>

            <style>{`
                .font-black { font-weight: 950; }
                .italic { font-style: italic; }
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(30px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}

export default JournalMode;
