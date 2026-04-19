import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, 
    Activity, Sparkles, BookOpen, Target, Brain, 
    Coins, ArrowRightLeft, PieChart, BarChart3, Wallet,
    CheckCircle2, AlertCircle, Loader2, Trophy,
    Heart, Scale, Zapata, Star
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedSide, setSelectedSide] = useState(null); // 'Debit' or 'Credit' for the current coin
    const [coinPlacing, setCoinPlacing] = useState(false);

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setUserAnswers([]);
        setScore(0);
        setCurrentIndex(0);
        setSelectedSide(null);

        const prompt = `You are an elite Accounting Game Designer. 
Generate a TRICKY accounting interview question.
Include dollar amounts in USD.

Requirements:
- Scenario: A juicy, tricky business transaction.
- Accounts: 2-4 primary involved accounts.
- Solution: Exact Dr/Cr sides.
- Logic: Hinglish explanation for "Why?"

Output ONLY JSON:
{
  "scenario": "...",
  "accountsInvolved": ["Account A", "Account B", ...],
  "correctEntries": [ { "account": "...", "side": "Debit"|"Credit", "amount": 1000 } ],
  "hinglishExplanation": "..."
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.8,
                    max_tokens: 1500,
                    response_format: { type: "json_object" }
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );

            const parsed = JSON.parse(response.data.choices[0].message.content);
            setScenario(parsed);
            setGameStatus('playing');
        } catch (error) {
            console.error(error);
            alert("API check failed. Key valid hai?");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const placeCoin = (side) => {
        if (coinPlacing) return;
        setCoinPlacing(true);
        setSelectedSide(side);

        const currentAccount = scenario.accountsInvolved[currentIndex];
        const correctEntry = scenario.correctEntries.find(e => e.account === currentAccount);
        const isCorrect = correctEntry && correctEntry.side === side;

        setTimeout(() => {
            const answer = { 
                account: currentAccount, 
                side, 
                amount: correctEntry ? correctEntry.amount : 0, 
                isCorrect 
            };
            
            const newAnswers = [...userAnswers, answer];
            setUserAnswers(newAnswers);

            if (currentIndex < scenario.accountsInvolved.length - 1) {
                setCurrentIndex(c => c + 1);
                setSelectedSide(null);
                setCoinPlacing(false);
            } else {
                setGameStatus('feedback');
                setCoinPlacing(false);
            }
        }, 800); // Animation duration
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent/30 overflow-x-hidden">
            {/* Glossy Header */}
            <header className="p-4 md:p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-[100]">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent font-black uppercase tracking-[0.3em]">Accounting Battle</span>
                        <h1 className="text-xl font-black italic tracking-tighter">COIN DROP PRO</h1>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                     <input 
                        type="password" 
                        placeholder="GROQ KEY"
                        value={groqApiKey}
                        onChange={(e) => {
                            setGroqApiKey(e.target.value);
                            localStorage.setItem('groqApiKey', e.target.value);
                        }}
                        className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] w-48 focus:border-accent transition-all text-center outline-none"
                    />
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-12 flex flex-col items-center">
                
                {/* IDLE SCREEN */}
                {gameStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-fadeIn">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/30 blur-[120px] rounded-full"></div>
                            <div className="relative scale-110">
                                <Coins size={150} className="text-accent animate-pulse" />
                                <Star size={40} className="absolute -top-4 -right-4 text-white animate-bounce" />
                            </div>
                        </div>
                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                                DROP THE COIN
                            </h2>
                            <p className="text-gray-400 text-lg md:text-xl font-medium">
                                Master T-Accounts by dropping coins into the right side. Tricky situations, real logic.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="relative group bg-accent text-black font-black px-16 py-7 rounded-[2rem] text-3xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_rgba(var(--accent-rgb),0.3)]"
                        >
                            PLAY NOW
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-[2rem]"></div>
                        </button>
                    </div>
                )}

                {/* GENERATING */}
                {gameStatus === 'generating' && (
                    <div className="flex flex-col items-center gap-10 mt-32">
                        <div className="relative">
                             <div className="w-24 h-24 border-8 border-white/5 border-t-accent rounded-full animate-spin"></div>
                             <Coins size={30} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                        </div>
                        <h3 className="text-2xl font-black tracking-widest text-accent animate-pulse uppercase">Minting Coins...</h3>
                    </div>
                )}

                {/* PLAYING - THE T-ACCOUNT STAGE */}
                {gameStatus === 'playing' && scenario && (
                    <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-12 animate-fadeIn items-start">
                        
                        {/* Scenario Card (Left) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#111] border-2 border-white/5 p-8 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20">
                                        <Target size={24} className="text-accent" />
                                    </div>
                                    <span className="font-black text-[10px] tracking-[0.4em] text-accent uppercase">Mission Scenario</span>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold leading-tight text-gray-100">
                                    {scenario.scenario}
                                </p>
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Account Selection</h4>
                                <div className="flex flex-wrap gap-2">
                                    {scenario.accountsInvolved.map((acc, i) => (
                                        <div key={i} className={`px-4 py-2 rounded-full text-xs font-bold border ${i === currentIndex ? 'bg-accent text-black border-accent' : i < currentIndex ? 'bg-gray-800 text-gray-500 border-transparent' : 'bg-transparent border-white/10 text-white'}`}>
                                            {acc}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* THE GIANT T-ACCOUNT (Center/Right) */}
                        <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-12">
                            
                            {/* The Floating Account Coin */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-accent/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className={`w-full max-w-sm bg-gradient-to-br from-yellow-400 to-yellow-600 text-black p-10 rounded-[2.5rem] shadow-[0_30px_90px_rgba(234,179,8,0.3)] border-4 border-white/20 text-center relative z-20 transform transition-all duration-700 ${coinPlacing ? (selectedSide === 'Debit' ? '-translate-x-48 translate-y-48 scale-50 opacity-0' : 'translate-x-48 translate-y-48 scale-50 opacity-0') : 'hover:-translate-y-2'}`}>
                                    <span className="block text-[8px] uppercase font-black tracking-[0.3em] text-black/40 mb-3">Place this Coin</span>
                                    <h3 className="text-3xl font-black uppercase leading-none">
                                        {scenario.accountsInvolved[currentIndex]}
                                    </h3>
                                </div>
                            </div>

                            {/* The T-System */}
                            <div className="w-full relative py-12 px-8">
                                {/* Vertical Line */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-1 md:w-2 bg-gradient-to-b from-white/20 via-white/40 to-white/20 -translate-x-1/2 rounded-full"></div>
                                {/* Horizontal Line */}
                                <div className="w-full h-1 md:h-2 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full mb-12"></div>

                                <div className="grid grid-cols-2 gap-8 md:gap-20">
                                    {/* DEBIT SIDE */}
                                    <div className="flex flex-col items-center gap-8">
                                        <h4 className="text-4xl md:text-6xl font-black italic text-white/10 select-none">DEBIT</h4>
                                        <button 
                                            onClick={() => placeCoin('Debit')}
                                            disabled={coinPlacing}
                                            className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center transition-all group relative overflow-hidden ${coinPlacing && selectedSide === 'Debit' ? 'bg-accent/40 border-accent scale-110' : 'hover:bg-white/5 hover:border-accent/40'}`}
                                        >
                                            <div className="absolute inset-0 bg-accent rotate-45 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-20"></div>
                                            <div className="text-center z-10">
                                                <Plus size={40} className="text-white/20 group-hover:text-accent transition-all mx-auto" />
                                                <span className="text-[10px] font-black text-white/10 group-hover:text-accent/40 tracking-[0.2em]">DROP DR</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* CREDIT SIDE */}
                                    <div className="flex flex-col items-center gap-8">
                                        <h4 className="text-4xl md:text-6xl font-black italic text-white/10 select-none">CREDIT</h4>
                                        <button 
                                            onClick={() => placeCoin('Credit')}
                                            disabled={coinPlacing}
                                            className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center transition-all group relative overflow-hidden ${coinPlacing && selectedSide === 'Credit' ? 'bg-[#ef4444]/40 border-[#ef4444] scale-110' : 'hover:bg-white/5 hover:border-[#ef4444]/40'}`}
                                        >
                                            <div className="absolute inset-0 bg-[#ef4444] rotate-45 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-20"></div>
                                            <div className="text-center z-10">
                                                <Plus size={40} className="text-white/20 group-hover:text-[#ef4444] transition-all mx-auto" />
                                                <span className="text-[10px] font-black text-white/10 group-hover:text-[#ef4444]/40 tracking-[0.2em]">DROP CR</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* FEEDBACK SCREEN */}
                {gameStatus === 'feedback' && scenario && (
                    <div className="w-full max-w-5xl space-y-12 animate-fadeIn pb-20">
                        <div className="text-center space-y-4">
                            <Trophy size={80} className="mx-auto text-accent mb-6" />
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter">BATTLE REPORT</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#111] border border-white/10 p-10 rounded-[3rem] space-y-8">
                                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Your Moves</h3>
                                <div className="space-y-6">
                                    {userAnswers.map((ans, i) => (
                                        <div key={i} className="flex justify-between items-center group">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-bold">{ans.account}</span>
                                                <span className={`text-xs font-black uppercase tracking-widest ${ans.side === 'Debit' ? 'text-accent' : 'text-[#ef4444]'}`}>{ans.side} SIDE</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {ans.isCorrect ? (
                                                    <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-4 py-2 rounded-full">
                                                        <CheckCircle2 size={16} className="text-accent" />
                                                        <span className="text-[10px] font-black text-accent uppercase">PERFECT</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full">
                                                        <AlertCircle size={16} className="text-red-500" />
                                                        <span className="text-[10px] font-black text-red-500 uppercase">MISMATCH</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#111] to-black border-2 border-accent/30 p-10 rounded-[3rem] relative overflow-hidden group">
                                <Brain size={150} className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform" />
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Scale size={24} className="text-accent" />
                                        <h4 className="text-2xl font-black italic">Instructor's Logic (Hinglish)</h4>
                                    </div>
                                    <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-medium">
                                        {scenario.hinglishExplanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={generateTrickyQuestion}
                            className="w-full bg-white text-black font-black py-8 rounded-[2rem] text-3xl hover:bg-accent transition-all flex justify-center items-center gap-6 group"
                        >
                            RE-ENGAGE BATTLE <RefreshCcw size={32} className="group-hover:rotate-180 transition-transform duration-700" />
                        </button>
                    </div>
                )}

            </main>

            <style>{`
                @keyframes coin-drop {
                    0% { transform: translateY(-500px) scale(1.5); opacity: 0; }
                    60% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: scale(0.8); opacity: 0; }
                }
                .font-black { font-weight: 950; }
                .tracking-tighter { letter-spacing: -0.05em; }
            `}</style>
        </div>
    );
}

export default JournalMode;
