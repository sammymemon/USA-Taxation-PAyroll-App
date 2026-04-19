import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, 
    Activity, Sparkles, BookOpen, Target, Brain, 
    Coins, ArrowRightLeft, PieChart, BarChart3, Wallet,
    CheckCircle2, AlertCircle, Loader2, Trophy,
    Heart, Timer, Zap, Scale, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

function JournalMode() {
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());
    const [gameStatus, setGameStatus] = useState('idle'); // idle, generating, playing, feedback
    const [scenario, setScenario] = useState(null);
    const [userAnswers, setUserAnswers] = useState([]); // { account, side, amount }
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Game State
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [currentIndex, setCurrentIndex] = useState(0); // For multiple account selection if needed
    const [equations, setEquations] = useState({ assets: 0, liabilities: 0, equity: 0 });

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setUserAnswers([]);
        setScore(0);
        setLives(3);

        const prompt = `You are a Senior Accounting Gameshow Host. 
Generate a TRICKY accounting interview question for a "Debit Credit" game app.
Include dollar amounts in USD.

Requirements:
- Scenario: A tricky business transaction (USA rules).
- Accounts: 4-5 involved accounts.
- Solution: Correct side (Debit/Credit) and amounts.
- Logic: Hinglish explanation.
- Balance Sheet Impact: Assets, Liabilities, Equity changes.

Output ONLY JSON:
{
  "scenario": "...",
  "accountsInvolved": ["Account A", "Account B", ...],
  "correctEntries": [ { "account": "...", "side": "Debit"|"Credit", "amount": 1000 } ],
  "hinglishExplanation": "...",
  "equationImpact": { "assets": 0, "liabilities": 0, "equity": 0 }
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.8,
                    max_tokens: 2000,
                    response_format: { type: "json_object" }
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );

            const parsed = JSON.parse(response.data.choices[0].message.content);
            setScenario(parsed);
            setGameStatus('playing');
            setCurrentIndex(0);
        } catch (error) {
            console.error(error);
            alert("API connection failed. Use valid Groq API key.");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswer = (side) => {
        const currentAccount = scenario.accountsInvolved[currentIndex];
        const correctEntry = scenario.correctEntries.find(e => e.account === currentAccount);
        
        const isCorrect = correctEntry && correctEntry.side === side;

        if (isCorrect) {
            setScore(s => s + 100);
            // Visual feedback logic would go here
        } else {
            setLives(l => Math.max(0, l - 1));
        }

        const answer = { 
            account: currentAccount, 
            side, 
            amount: correctEntry ? correctEntry.amount : 0, 
            isCorrect 
        };
        
        setUserAnswers([...userAnswers, answer]);

        if (currentIndex < scenario.accountsInvolved.length - 1) {
            setCurrentIndex(c => c + 1);
        } else {
            setGameStatus('feedback');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-accent/30 overflow-x-hidden">
            {/* Game Header */}
            <header className="p-4 flex justify-between items-center border-b border-white/10 bg-[#1e293b]/50 backdrop-blur-xl sticky top-0 z-[100]">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <ArrowLeft />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Accounting Play</span>
                        <h1 className="text-lg font-black italic flex items-center gap-2">
                             DEBIT <ArrowRightLeft size={16} className="text-gray-500" /> CREDIT
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                        <Trophy size={18} className="text-yellow-400" />
                        <span className="font-black text-xl tabular-nums">{score}</span>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                            <Heart 
                                key={i} 
                                size={24} 
                                fill={i < lives ? "#ef4444" : "transparent"} 
                                className={i < lives ? "text-red-500" : "text-white/20"} 
                            />
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                
                {/* IDLE SCREEN */}
                {gameStatus === 'idle' && (
                    <div className="text-center space-y-12 animate-fadeIn flex flex-col items-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full group-hover:bg-accent/40 transition-all duration-1000"></div>
                            <div className="relative bg-[#1e293b] p-12 rounded-[3rem] border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                                <Scale size={130} className="text-accent" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter">Debit or Credit?</h2>
                            <p className="text-gray-400 text-lg max-w-md mx-auto font-medium">
                                Fast-paced accounting battle. Categorize accounts and balance the equation.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="group relative bg-white text-black font-black px-16 py-6 rounded-full text-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center gap-4 overflow-hidden"
                        >
                            <span className="relative z-10">PLAY NOW</span>
                            <Zap className="relative z-10 fill-black" />
                            <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>

                        <div className="pt-8">
                             <input 
                                type="password" 
                                placeholder="PASTE YOUR GROQ API KEY HERE"
                                value={groqApiKey}
                                onChange={(e) => {
                                    setGroqApiKey(e.target.value);
                                    localStorage.setItem('groqApiKey', e.target.value);
                                }}
                                className="bg-[#1e293b] border border-white/10 px-6 py-3 rounded-2xl text-xs w-64 text-center outline-none focus:border-accent transition-all font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* GENERATING SCREEN */}
                {gameStatus === 'generating' && (
                    <div className="flex flex-col items-center gap-8 animate-pulse text-center">
                        <div className="relative">
                            <Loader2 size={100} className="text-accent animate-spin" />
                            <Zap size={30} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                        </div>
                        <div className="space-y-2">
                             <h3 className="text-2xl font-black">PREPARING SCENARIO</h3>
                             <p className="text-gray-500 font-mono">Loading tricky GAAP concepts...</p>
                        </div>
                    </div>
                )}

                {/* PLAYING SCREEN */}
                {gameStatus === 'playing' && scenario && (
                    <div className="w-full flex flex-col gap-8 animate-fadeIn">
                        
                        {/* THE SCENARIO CARD */}
                        <div className="bg-[#1e293b] border-2 border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-accent/20 p-2 rounded-xl">
                                    <Target size={20} className="text-accent" />
                                </div>
                                <span className="text-accent text-[10px] font-black uppercase tracking-[0.3em]">Active Mission</span>
                            </div>
                            <p className="text-2xl md:text-3xl font-bold leading-tight">
                                {scenario.scenario}
                            </p>
                        </div>

                        {/* THE GAME STAGE (Pads) */}
                        <div className="relative flex flex-col items-center gap-12 py-12">
                            
                            {/* Account Token (Flies) */}
                            <div className="w-full max-w-sm bg-white text-black p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-4 border-black text-center animate-bounce-soft relative z-20">
                                <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Assign this account:</span>
                                <h3 className="text-3xl font-black uppercase">
                                    {scenario.accountsInvolved[currentIndex]}
                                </h3>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-[10px] font-black">
                                    {currentIndex + 1} / {scenario.accountsInvolved.length}
                                </div>
                            </div>

                            {/* The Big Pads */}
                            <div className="grid grid-cols-2 gap-8 w-full">
                                <button 
                                    onClick={() => handleAnswer('Debit')}
                                    className="group relative h-48 bg-[#10b981] rounded-[3rem] border-b-[8px] border-black/40 hover:translate-y-2 hover:border-b-0 transition-all flex items-center justify-center overflow-hidden active:scale-95"
                                >
                                    <div className="relative z-10 text-center">
                                        <span className="text-4xl font-black italic block">DEBIT</span>
                                        <span className="text-[10px] font-bold opacity-70">LEFT SIDE [DR]</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>

                                <button 
                                    onClick={() => handleAnswer('Credit')}
                                    className="group relative h-48 bg-[#ef4444] rounded-[3rem] border-b-[8px] border-black/40 hover:translate-y-2 hover:border-b-0 transition-all flex items-center justify-center overflow-hidden active:scale-95"
                                >
                                    <div className="relative z-10 text-center">
                                        <span className="text-4xl font-black italic block">CREDIT</span>
                                        <span className="text-[10px] font-bold opacity-70">RIGHT SIDE [CR]</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>
                            </div>
                        </div>

                        {/* BALANCE BAR */}
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Accounting Equation Check</span>
                                <Scale size={16} className="text-accent" />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                                    <div className="absolute inset-y-0 left-0 bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: equations.assets + '%' }}></div>
                                </div>
                                <span className="font-black text-xs">ASSETS</span>
                                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                                    <div className="absolute inset-y-0 left-0 bg-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000" style={{ width: (equations.liabilities + equations.equity) + '%' }}></div>
                                </div>
                                <span className="font-black text-xs">L + E</span>
                            </div>
                        </div>

                    </div>
                )}

                {/* FEEDBACK SCREEN */}
                {gameStatus === 'feedback' && scenario && (
                    <div className="w-full space-y-8 animate-fadeIn">
                        
                        {/* Results Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#10b981]/10 border-2 border-[#10b981]/30 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                                <div className="p-4 bg-[#10b981]/20 rounded-full">
                                    <CheckCircle2 size={40} className="text-[#10b981]" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black">MISSION COMPLETE</h4>
                                    <p className="text-[#10b981] font-bold">You earned {score} points!</p>
                                </div>
                            </div>

                             <div className="bg-[#1e293b] border border-white/10 p-8 rounded-[2.5rem]">
                                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Entry Breakdown</h4>
                                <div className="space-y-4">
                                    {userAnswers.map((ans, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate max-w-[150px]">{ans.account}</span>
                                                <span className={`text-[10px] font-black ${ans.side === 'Debit' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{ans.side}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm">${ans.amount.toLocaleString()}</span>
                                                {ans.isCorrect ? <CheckCircle2 size={16} className="text-[#10b981]" /> : <AlertCircle size={16} className="text-[#ef4444]" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Hinglish Explanation (The Instructor) */}
                        <div className="bg-gradient-to-br from-[#1e293b] to-black border-2 border-accent/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Brain size={150} />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="bg-accent/20 p-3 rounded-2xl text-accent border border-accent/20">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-2xl font-black italic">Instructor's Game Tip</h3>
                            </div>
                            <p className="text-xl md:text-2xl text-white leading-relaxed relative z-10 font-medium">
                                {scenario.hinglishExplanation}
                            </p>
                        </div>

                        <button 
                            onClick={generateTrickyQuestion}
                            className="w-full bg-accent text-black font-black py-6 rounded-full text-2xl hover:scale-105 transition-all flex justify-center items-center gap-4 shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)]"
                        >
                            <RefreshCcw /> NEXT ROUND
                        </button>

                    </div>
                )}

            </main>

            <style>{`
                @keyframes bounce-soft {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                .animate-bounce-soft {
                    animation: bounce-soft 3s ease-in-out infinite;
                }
                .font-black { font-weight: 900; }
            `}</style>
        </div>
    );
}

export default JournalMode;
