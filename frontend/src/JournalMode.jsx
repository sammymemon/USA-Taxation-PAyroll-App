import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, CheckCircle2, AlertCircle, Loader2, Trophy,
    Scale, Star, ChevronRight, Zap, Coins, Brain, Sparkles, BookOpen, Target, RefreshCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

function JournalMode() {
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());
    const [gameStatus, setGameStatus] = useState('idle'); // idle, generating, playing, feedback
    const [scenario, setScenario] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { [accountName]: 'Debit' | 'Credit' }
    const [isGenerating, setIsGenerating] = useState(false);

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setUserAnswers({});

        const customPrompt = `Generate a TRICKY accounting interview question in JSON.
        
CRITICAL: The "scenario" description MUST be entirely in smooth HINGLISH (Hindi mixed with English).
Include specific dollar amounts (USD).

Output ONLY pure RAW JSON. No explanations, no markdown fences.
{
  "scenario": "Aapki Hinglish story yahan aayegi...",
  "accountsInvolved": ["Machine", "Cash", "Discount", "..."],
  "correctEntries": [ 
    { "account": "Machine", "side": "Debit", "amount": 1000 }, 
    { "account": "Cash", "side": "Credit", "amount": 1000 } 
  ],
  "hinglishExplanation": "Instructor's Hinglish logic here..."
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
            
            // Clean up exact names so UI matching works flawlessly
            parsed.accountsInvolved = parsed.accountsInvolved || [];
            parsed.correctEntries = parsed.correctEntries || [];
            
            setScenario(parsed);
            setGameStatus('playing');
        } catch (error) {
            console.error(error);
            alert("Error in generating challenge. Please check your Groq API Key or internet.");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelection = (account, side) => {
        setUserAnswers(prev => ({ ...prev, [account]: side }));
    };

    const submitBattle = () => {
        if (!scenario) return;
        if (Object.keys(userAnswers).length < scenario.accountsInvolved.length) {
            return alert("Har account ka Debit ya Credit side select karein!");
        }
        setGameStatus('feedback');
    };

    return (
        <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-accent/30 overflow-x-hidden p-2 md:p-6">
            <header className="p-4 flex justify-between items-center bg-[#111116]/80 backdrop-blur-2xl sticky top-0 z-[100] border border-white/10 rounded-3xl mb-8">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/10">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-accent font-black uppercase tracking-[0.3em]">Hinglish Battle</span>
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
                            <Coins size={120} className="text-accent relative z-10 animate-bounce" />
                        </div>
                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
                                DROP THE COINS
                            </h2>
                            <p className="text-gray-400 text-lg md:text-xl font-medium">
                                Multi T-Account system in Hinglish. Drop coins into Dr/Cr and master USA GAAP.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-gradient-to-r from-accent to-yellow-600 text-black font-black px-12 py-6 rounded-[2rem] text-2xl hover:scale-105 transition-transform shadow-[0_20px_60px_rgba(var(--accent-rgb),0.4)] flex items-center gap-3"
                        >
                            <Zap className="fill-black" /> START MISSION
                        </button>
                    </div>
                )}

                {gameStatus === 'generating' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fadeIn text-center">
                        <div className="relative p-8 bg-white/5 rounded-full border border-white/10">
                            <Loader2 size={80} className="text-accent animate-spin" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-widest text-accent uppercase italic animate-pulse">Syncing New Case...</h3>
                    </div>
                )}

                {gameStatus === 'playing' && scenario && (
                    <div className="space-y-10 animate-fadeIn pb-32">
                        <div className="bg-[#111116] border border-white/10 p-6 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden ring-1 ring-white/5 mx-auto max-w-4xl">
                            <div className="absolute -top-10 -right-10 p-10 opacity-5">
                                <BookOpen size={200} />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10 bg-black/40 border border-white/5 inline-flex px-4 py-2 rounded-full">
                                <Target size={16} className="text-accent" />
                                <span className="font-black text-xs uppercase tracking-[0.2em] text-accent">Mission Scenario</span>
                            </div>
                            <p className="text-xl md:text-3xl font-bold leading-relaxed text-gray-100 relative z-10 font-serif">
                                "{scenario.scenario}"
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                            {scenario.accountsInvolved.map((acc, index) => {
                                const correctData = scenario.correctEntries?.find(e => e.account.toLowerCase() === acc.toLowerCase());
                                const amount = correctData ? Number(correctData.amount) : 0;
                                const selectedSide = userAnswers[acc];

                                return (
                                    <div key={index} className="bg-[#16161c] border border-white/10 rounded-[3rem] p-6 space-y-8 relative shadow-2xl overflow-hidden group">
                                        
                                        {/* Coin Element */}
                                        <div className="flex justify-center -mt-10 relative z-20 pointer-events-none">
                                            <div className="bg-gradient-to-b from-accent to-yellow-600 text-black font-black uppercase italic tracking-widest px-8 py-4 rounded-[2rem] shadow-[0_15px_30px_rgba(var(--accent-rgb),0.4)] border-b-4 border-yellow-700 flex flex-col items-center gap-1">
                                                 <span className="text-[10px] opacity-70 border-b border-black/20 pb-1">PLACE THIS COIN</span>
                                                 <span className="text-lg truncate max-w-[200px]">{acc}</span>
                                            </div>
                                        </div>

                                        <div className="w-full relative px-2 pt-6 pb-2">
                                            <div className="w-full h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full mb-6"></div>
                                            <div className="absolute left-1/2 top-10 bottom-0 w-2 bg-gradient-to-b from-white/20 to-transparent -translate-x-1/2 rounded-full"></div>

                                            <div className="grid grid-cols-2 gap-4 h-52">
                                                <button 
                                                    onClick={() => handleSelection(acc, 'Debit')}
                                                    className={`rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden
                                                        ${selectedSide === 'Debit' ? 'bg-accent/10 border-accent' : 'bg-transparent border-dashed border-white/10 hover:border-white/30 text-white/40'}`}
                                                >
                                                    {selectedSide === 'Debit' ? (
                                                        <div className="flex flex-col items-center gap-2 animate-fadeIn bg-accent text-black w-full h-full justify-center">
                                                            <span className="text-4xl font-black italic">DR</span>
                                                            <span className="text-xl font-bold bg-black/10 px-4 py-1 rounded-full">${amount.toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Plus size={30} className="opacity-50" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">DROP DR</span>
                                                        </div>
                                                    )}
                                                </button>

                                                <button 
                                                    onClick={() => handleSelection(acc, 'Credit')}
                                                    className={`rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden
                                                        ${selectedSide === 'Credit' ? 'bg-red-500/10 border-red-500' : 'bg-transparent border-dashed border-white/10 hover:border-white/30 text-white/40'}`}
                                                >
                                                    {selectedSide === 'Credit' ? (
                                                        <div className="flex flex-col items-center gap-2 animate-fadeIn bg-red-500 text-white w-full h-full justify-center">
                                                            <span className="text-4xl font-black italic">CR</span>
                                                            <span className="text-xl font-bold bg-black/20 px-4 py-1 rounded-full">${amount.toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Plus size={30} className="opacity-50" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">DROP CR</span>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center pt-10">
                            <button 
                                onClick={submitBattle}
                                className="bg-white text-black font-black px-16 py-6 rounded-full text-2xl md:text-3xl hover:bg-gray-200 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4 active:scale-95"
                            >
                                EVALUATE JOURNAL <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                )}

                {gameStatus === 'feedback' && scenario && (
                    <div className="space-y-10 animate-fadeIn pb-32">
                        <div className="text-center space-y-4">
                            <div className="inline-block p-6 bg-accent/10 rounded-full border border-accent/20 mb-2">
                                <Trophy size={60} className="text-accent animate-bounce" />
                            </div>
                            <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter">Evaluation Report</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#111116] p-8 md:p-10 rounded-[3rem] border border-white/10 space-y-8">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Integrity Check</h3>
                                <div className="space-y-6">
                                    {scenario.accountsInvolved.map((acc, i) => {
                                        const correctData = scenario.correctEntries?.find(e => e.account.toLowerCase() === acc.toLowerCase());
                                        const isCorrect = correctData && userAnswers[acc] === correctData.side;
                                        
                                        return (
                                            <div key={i} className={`flex justify-between items-center p-6 rounded-3xl border-2 transition-all ${isCorrect ? 'bg-accent/5 border-accent/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-xl md:text-2xl font-black uppercase text-white/90 truncate max-w-[200px]">{acc}</span>
                                                    <span className={`text-[10px] font-black mt-1 uppercase tracking-widest ${userAnswers[acc] === 'Debit' ? 'text-accent' : 'text-red-500'}`}>YOU PLACED: {userAnswers[acc] || 'NOTHING'}</span>
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
                                        <h4 className="text-3xl font-black italic leading-none">THE LOGIC <br/>(HINGLISH)</h4>
                                    </div>
                                    <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-serif">
                                         {scenario.hinglishExplanation}
                                    </p>
                                    <div className="pt-6 border-t border-white/10 space-y-4">
                                        <p className="text-accent font-black text-[10px] uppercase tracking-widest">Correct Solution</p>
                                        <div className="space-y-2">
                                            {scenario.correctEntries?.map((e, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
                                                    <span className="font-bold text-gray-300 text-sm">{e.account}</span>
                                                    <span className={`text-base font-black ${e.side === 'Debit' ? 'text-accent' : 'text-red-500'}`}>{e.side}: ${Number(e.amount || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-white text-black font-black w-full py-8 rounded-[2rem] text-3xl hover:bg-gray-200 transition-all flex justify-center items-center gap-4 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                        >
                            <RefreshCcw size={32} /> PLAY AGAIN
                        </button>
                    </div>
                )}
            </main>

            <style>{`
                .font-black { font-weight: 900; }
                .italic { font-style: italic; }
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
}

export default JournalMode;
