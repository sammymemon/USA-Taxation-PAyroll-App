import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, CheckCircle2, AlertCircle, Loader2, Trophy,
    Scale, Star, ChevronRight, Zap, Coins, Brain, Sparkles, BookOpen, Target, RefreshCcw, Info, X, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

function JournalMode() {
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());
    const [gameStatus, setGameStatus] = useState('idle'); // idle, generating, playing, feedback
    const [scenario, setScenario] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { [accountName]: 'Debit' | 'Credit' }
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState(null); // stores the reasoning text

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setUserAnswers({});
        setActiveTooltip(null);

        const customPrompt = `Generate a TRICKY accounting interview question in JSON format.
        
CRITICAL RULES:
1. The "scenario" must be entirely in smooth HINGLISH. Include specific USD dollar amounts.
2. VERIFY MATHEMATICALLY that Total Debits == Total Credits before creating the JSON.
3. Every account must have a "whyThisAmount" field explaining how the amount was calculated (in Hinglish).

Output strictly this JSON structure, nothing else:
{
  "scenario": "Aapki Hinglish story yahan aayegi...",
  "accountsInvolved": [
    {
      "account": "Machine",
      "amount": 4500,
      "whyThisAmount": "Kyuki $5000 par 10% discount tha, isliye $5000 - $500 = $4500",
      "correctSide": "Debit"
    },
    {
      "account": "Cash",
      "amount": 4500,
      "whyThisAmount": "Payment turant ki gayi toh cash utna hi kam hoga.",
      "correctSide": "Credit"
    }
  ],
  "hinglishExplanation": "Instructor ki final logic yahan aayegi..."
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: customPrompt }],
                    temperature: 0.1,
                    max_tokens: 2500,
                    response_format: { type: "json_object" }
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );

            let text = response.data.choices[0].message.content || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found");
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate Structure and force fallback values if AI hallucinates
            if (!parsed.accountsInvolved || !Array.isArray(parsed.accountsInvolved)) {
                throw new Error("Invalid format: accountsInvolved is missing or not an array");
            }
            
            setScenario(parsed);
            setGameStatus('playing');
        } catch (error) {
            console.error(error);
            alert("Error: Validation failed or generation issue. Please retry.");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelection = (accountName, side) => {
        setUserAnswers(prev => ({ ...prev, [accountName]: side }));
    };

    const submitBattle = () => {
        if (!scenario) return;
        if (Object.keys(userAnswers).length < scenario.accountsInvolved.length) {
            return alert("Har account ka Debit ya Credit zone select karein!");
        }
        setGameStatus('feedback');
    };

    return (
        <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-accent/30 overflow-x-hidden p-2 md:p-6 relative">
            <header className="p-4 flex justify-between items-center bg-[#111116]/80 backdrop-blur-2xl sticky top-0 z-[100] border border-white/10 rounded-3xl mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/10">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent font-black uppercase tracking-[0.3em]">AI Verified</span>
                        <h1 className="text-lg md:text-xl font-black italic tracking-tighter uppercase">Accounting Pro</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                     <input 
                        type="password" 
                        placeholder="GROQ API KEY"
                        value={groqApiKey}
                        onChange={(e) => {
                            setGroqApiKey(e.target.value);
                            localStorage.setItem('groqApiKey', e.target.value);
                        }}
                        className="bg-black/50 border border-white/10 px-4 py-3 rounded-2xl text-xs w-32 md:w-48 focus:border-accent outline-none text-center font-mono shadow-inner"
                    />
                </div>
            </header>

            <main className="max-w-6xl mx-auto space-y-10">
                {gameStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/30 blur-[100px] rounded-full"></div>
                            <Scale size={120} className="text-accent relative z-10 animate-bounce" />
                        </div>
                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
                                PRECISION MODE
                            </h2>
                            <p className="text-gray-400 text-lg md:text-xl font-medium">
                                AI verified numbers. Pure Hinglish Scenarios. The Ultimate Ledger Test.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-gradient-to-r from-accent to-yellow-600 text-black font-black px-12 py-6 rounded-[2rem] text-2xl hover:scale-105 transition-transform shadow-[0_20px_60px_rgba(var(--accent-rgb),0.4)] flex items-center gap-3"
                        >
                            <Zap className="fill-black" /> GENERATE MISSION
                        </button>
                    </div>
                )}

                {gameStatus === 'generating' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fadeIn text-center">
                        <div className="relative p-8 bg-white/5 rounded-full border border-white/10">
                            <Loader2 size={80} className="text-accent animate-spin" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-widest text-accent uppercase italic animate-pulse">Running AI Verification Check...</h3>
                        <p className="text-gray-500 font-mono text-sm max-w-xs">Ensuring Debits = Credits strictly.</p>
                    </div>
                )}

                {gameStatus === 'playing' && scenario && (
                    <div className="space-y-10 animate-fadeIn pb-32">
                        {/* THE SCENARIO */}
                        <div className="bg-[#111116] border border-white/10 p-6 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden ring-1 ring-white/5 mx-auto max-w-4xl">
                            <div className="absolute -top-10 -right-10 p-10 opacity-5">
                                <BookOpen size={200} />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10 bg-black/40 border border-white/5 inline-flex px-4 py-2 rounded-full">
                                <Target size={16} className="text-accent" />
                                <span className="font-black text-xs uppercase tracking-[0.2em] text-accent">Mission Scenario</span>
                            </div>
                            <p className="text-xl md:text-3xl font-bold leading-relaxed text-gray-100 relative z-10 font-serif drop-shadow-md">
                                "{scenario.scenario}"
                            </p>
                        </div>

                        {/* MULTI T-ACCOUNT GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 pt-4">
                            {(scenario.accountsInvolved || []).map((acc, index) => {
                                const accountName = acc?.account || "Unknown Account";
                                const selectedSide = userAnswers[accountName];
                                const amount = acc?.amount || 0;
                                const whyText = acc?.whyThisAmount || "No explanation provided.";

                                return (
                                    <div key={index} className="bg-[#16161c] border border-white/10 rounded-[3rem] p-6 space-y-6 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-visible group">
                                        
                                        {/* Golden Floating Coin with Amount & Info */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                                            <div className="relative">
                                                <div className="bg-gradient-to-b from-accent to-yellow-600 text-black px-8 py-3 rounded-[2rem] shadow-[0_15px_30px_rgba(var(--accent-rgb),0.5)] border-b-4 border-yellow-700 flex flex-col items-center gap-1 min-w-[200px]">
                                                    <span className="text-[9px] font-black opacity-80 border-b border-black/20 pb-1 uppercase tracking-widest w-full text-center">ACCOUNT COIN</span>
                                                    <span className="text-xl font-black italic uppercase truncate w-full text-center">{accountName}</span>
                                                </div>
                                                
                                                {/* Why this amount? Button */}
                                                <button 
                                                    onClick={() => setActiveTooltip({ account: accountName, text: whyText, amount: amount })}
                                                    className="absolute -right-3 -bottom-3 bg-[#111] text-white p-2 rounded-full border border-white/20 hover:border-accent hover:text-accent hover:scale-110 transition-all shadow-xl group-hover:animate-pulse z-30"
                                                    title="Why this amount?"
                                                >
                                                    <Info size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* T-Account Framework */}
                                        <div className="w-full relative px-2 pt-10 pb-2">
                                            <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full mb-6"></div>
                                            <div className="absolute left-1/2 top-12 bottom-0 w-1.5 bg-gradient-to-b from-white/30 to-transparent -translate-x-1/2 rounded-full"></div>

                                            <div className="grid grid-cols-2 gap-4 h-48 md:h-56">
                                                {/* DEBIT ZONE */}
                                                <button 
                                                    onClick={() => handleSelection(accountName, 'Debit')}
                                                    className={`rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden group
                                                        ${selectedSide === 'Debit' ? 'bg-accent/10 border-accent shadow-[0_0_40px_rgba(var(--accent-rgb),0.2)]' : 'bg-black/30 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                                                >
                                                    {selectedSide === 'Debit' ? (
                                                        <div className="flex flex-col items-center gap-1 animate-fadeIn bg-accent text-black w-full h-full justify-center">
                                                            <span className="text-4xl md:text-5xl font-black italic opacity-90">DR</span>
                                                            <span className="text-2xl md:text-3xl font-black bg-black/10 px-4 py-1 rounded-full border border-black/10">${Number(amount).toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-3xl font-black italic text-white/20">DR</span>
                                                            <div className="bg-black/40 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2 text-white/40">
                                                                <span className="text-sm font-bold">${Number(amount).toLocaleString()}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-accent/60 mt-2">CLICK TO DROP</span>
                                                        </div>
                                                    )}
                                                </button>

                                                {/* CREDIT ZONE */}
                                                <button 
                                                    onClick={() => handleSelection(accountName, 'Credit')}
                                                    className={`rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden group
                                                        ${selectedSide === 'Credit' ? 'bg-red-500/10 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'bg-black/30 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                                                >
                                                    {selectedSide === 'Credit' ? (
                                                        <div className="flex flex-col items-center gap-1 animate-fadeIn bg-red-500 text-white w-full h-full justify-center">
                                                            <span className="text-4xl md:text-5xl font-black italic opacity-90">CR</span>
                                                            <span className="text-2xl md:text-3xl font-black bg-black/20 px-4 py-1 rounded-full border border-black/10">${Number(amount).toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-3xl font-black italic text-white/20">CR</span>
                                                            <div className="bg-black/40 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2 text-white/40">
                                                                <span className="text-sm font-bold">${Number(amount).toLocaleString()}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500/60 mt-2">CLICK TO DROP</span>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center pt-14">
                            <button 
                                onClick={submitBattle}
                                className="bg-white text-black font-black px-16 py-6 rounded-full text-2xl md:text-3xl hover:bg-gray-200 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4 active:scale-95"
                            >
                                VERIFY JOURNAL <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                )}

                {/* FINAL FEEDBACK */}
                {gameStatus === 'feedback' && scenario && (
                    <div className="space-y-10 animate-fadeIn pb-32">
                        <div className="text-center space-y-4">
                            <div className="inline-block p-6 bg-accent/10 rounded-full border border-accent/20 mb-2">
                                <Activity size={60} className="text-accent animate-pulse" />
                            </div>
                            <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter">Mission Report</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#111116] p-8 md:p-10 rounded-[3rem] border border-white/10 space-y-8">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Accuracy Check</h3>
                                <div className="space-y-4">
                                    {(scenario.accountsInvolved || []).map((acc, i) => {
                                        const accountName = acc?.account || "Unknown Account";
                                        const correctSide = acc?.correctSide || "Debit";
                                        const amount = acc?.amount || 0;
                                        const isCorrect = userAnswers[accountName] === correctSide;
                                        return (
                                            <div key={i} className={`flex justify-between items-center p-6 rounded-3xl border-2 transition-all ${isCorrect ? 'bg-accent/5 border-accent/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-xl font-black uppercase text-white/90 truncate">{accountName}</span>
                                                    <span className="text-sm font-medium text-white/50">${Number(amount).toLocaleString()}</span>
                                                    <span className={`text-[10px] font-black mt-2 uppercase tracking-widest ${userAnswers[accountName] === 'Debit' ? 'text-accent' : 'text-red-500'}`}>YOU DROPPED: {userAnswers[accountName] || 'NULL'}</span>
                                                </div>
                                                {isCorrect ? <CheckCircle2 size={40} className="text-accent" /> : <AlertCircle size={40} className="text-red-500" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#16161c] to-black p-8 md:p-12 rounded-[3rem] border border-accent/20 flex flex-col justify-center relative overflow-hidden shadow-2xl">
                                <Brain size={250} className="absolute -bottom-20 -right-20 opacity-5" />
                                <div className="space-y-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <Sparkles size={32} className="text-accent" />
                                        <h4 className="text-3xl font-black italic leading-none">AI LOGIC</h4>
                                    </div>
                                    <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-serif">
                                         {scenario.hinglishExplanation}
                                    </p>
                                    <div className="pt-6 border-t border-white/10 space-y-4">
                                        <p className="text-accent font-black text-[10px] uppercase tracking-widest">Correct Verified Ledger</p>
                                        <div className="space-y-2">
                                            {(scenario.accountsInvolved || []).map((e, idx) => {
                                                const accountName = e?.account || "Unknown Account";
                                                const correctSide = e?.correctSide || "Debit";
                                                const amount = e?.amount || 0;
                                                return (
                                                    <div key={idx} className="flex justify-between items-center bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
                                                        <span className="font-bold text-gray-300 text-sm">{accountName}</span>
                                                        <span className={`text-base font-black ${correctSide === 'Debit' ? 'text-accent' : 'text-red-500'}`}>{correctSide}: ${Number(amount).toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-white text-black font-black w-full py-8 rounded-[2rem] text-3xl hover:bg-gray-200 transition-all flex justify-center items-center gap-4 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                        >
                            <RefreshCcw size={32} /> NEW VERIFIED MISSION
                        </button>
                    </div>
                )}
            </main>

            {/* FLOATING TOOLTIP OVERLAY */}
            {activeTooltip && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#111] border-2 border-accent rounded-[3rem] p-10 max-w-lg w-full relative shadow-[0_0_80px_rgba(var(--accent-rgb),0.3)]">
                        <button 
                            onClick={() => setActiveTooltip(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-accent hover:text-black transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex flex-col gap-6 text-center pt-4">
                            <div className="flex justify-center">
                                <div className="bg-accent/20 p-4 rounded-full">
                                    <Coins size={40} className="text-accent" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black uppercase text-white">{activeTooltip.account}</h3>
                            <h4 className="text-5xl font-black italic text-accent">${Number(activeTooltip.amount).toLocaleString()}</h4>
                            <div className="h-px w-full bg-white/10 my-2"></div>
                            <p className="text-xl font-medium text-gray-300 font-serif leading-relaxed">
                                "{activeTooltip.text}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .font-black { font-weight: 900; }
                .italic { font-style: italic; }
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(15px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}

export default JournalMode;
