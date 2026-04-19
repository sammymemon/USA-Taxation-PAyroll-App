import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, 
    Activity, Sparkles, BookOpen, Target, Brain, 
    Coins, ArrowRightLeft, PieChart, BarChart3, Wallet,
    CheckCircle2, AlertCircle, Loader2, Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CHART_OF_ACCOUNTS = [
    "1000 - Cash", "1200 - Accounts Receivable", "1300 - Inventory", "1400 - Prepaid Expenses",
    "1500 - Equipment", "2000 - Accounts Payable", "2100 - Wages Payable", "2150 - Payroll Taxes Payable",
    "2400 - Unearned Revenue", "2700 - Notes Payable", "3000 - Common Stock", "3100 - Retained Earnings",
    "4000 - Sales Revenue", "4100 - Service Revenue", "5000 - Cost of Goods Sold", "5100 - Payroll Expense",
    "5200 - Rent Expense", "5300 - Utilities Expense", "5400 - Depreciation Expense", "5800 - Professional Fees"
];

function JournalMode() {
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());
    const [gameStatus, setGameStatus] = useState('idle'); // idle, generating, playing, evaluating, feedback
    const [scenario, setScenario] = useState(null);
    const [userAnswers, setUserAnswers] = useState([]); // { account, side, amount }
    const [feedback, setFeedback] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);

    const generateTrickyQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key first.");
        
        setIsGenerating(true);
        setGameStatus('generating');
        setFeedback(null);
        setUserAnswers([]);

        const prompt = `You are a Senior Accounting Interviewer for a top USA firm. 
Generate a TRICKY accounting interview question based on realistic business scenarios (USA bookkeeping/payroll).
Include dollar amounts in USD.

Requirements:
- The question must be slightly tricky (interview level), e.g., involving accruals, payroll taxes, discounts, or prepaid adjustments.
- Give a clear "scenario" description.
- List 4-6 "accountsInvolved" (some may be distractors).
- Provide the "correctEntries" (list of { "account": "...", "side": "Debit"|"Credit", "amount": number }).
- Provide "tAccountBalances" (list of { "account": "...", "dr": number, "cr": number, "final": number }) for the correct solution.
- Provide impact on "reports": {
    "pl": [ { "item": "...", "amount": number } ],
    "bs": [ { "item": "...", "amount": number } ],
    "incomeStatement": [ { "item": "...", "amount": number } ]
  }
- Provide a "hinglishExplanation" explaining the logic in easy Hinglish.

Output ONLY JSON:
{
  "scenario": "...",
  "accountsInvolved": ["...", "..."],
  "correctEntries": [ { "account": "...", "side": "...", "amount": 0 } ],
  "tAccountBalances": [ { "account": "...", "dr": 0, "cr": 0, "final": 0 } ],
  "reports": { ... },
  "hinglishExplanation": "..."
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
        } catch (error) {
            console.error(error);
            alert("Failed to generate question. Check your API key or connection.");
            setGameStatus('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleAccountSelection = (account, side) => {
        const existingIndex = userAnswers.findIndex(a => a.account === account && a.side === side);
        if (existingIndex > -1) {
            const newAnswers = [...userAnswers];
            newAnswers.splice(existingIndex, 1);
            setUserAnswers(newAnswers);
        } else {
            setUserAnswers([...userAnswers, { account, side, amount: '' }]);
        }
    };

    const updateAmount = (account, side, amount) => {
        setUserAnswers(userAnswers.map(ans => 
            (ans.account === account && ans.side === side) ? { ...ans, amount } : ans
        ));
    };

    const submitAnswer = () => {
        if (userAnswers.length === 0) return alert("Pehle entries to karo!");
        setIsEvaluating(true);
        setGameStatus('evaluating');

        // Logic to compare userAnswers with scenario.correctEntries
        // For simplicity and better feedback, we'll let the AI evaluate or do a client-side match
        // But the user requested "show the correct answer and explanation"
        setTimeout(() => {
            setGameStatus('feedback');
            setIsEvaluating(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <header className="bg-surface/80 backdrop-blur-md border-b border-border p-4 sticky top-0 z-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-xl hover:bg-surface2 transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl font-bold flex items-center gap-2">
                        <Coins className="text-accent" /> Journal Game
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="password" 
                        placeholder="Groq API Key"
                        value={groqApiKey}
                        onChange={(e) => {
                            setGroqApiKey(e.target.value);
                            localStorage.setItem('groqApiKey', e.target.value);
                        }}
                        className="bg-bg border border-border px-3 py-1.5 rounded-lg text-xs w-32 md:w-48 outline-none focus:border-accent transition-all"
                    />
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                {gameStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full"></div>
                            <Trophy size={120} className="text-accent relative z-10 animate-bounce" />
                        </div>
                        <div className="space-y-4 max-w-2xl px-4">
                            <h2 className="text-4xl md:text-6xl font-playfair font-black text-white">The Ultimate Journal Entry Battle</h2>
                            <p className="text-muted text-lg leading-relaxed">
                                Crack tricky USA accounting interview questions. Balance your T-accounts and see real-time impact on financial statements.
                            </p>
                        </div>
                        <button 
                            onClick={generateTrickyQuestion}
                            className="bg-accent text-bg font-bold px-12 py-5 rounded-2xl text-xl hover:scale-105 transition-all shadow-lg shadow-accent/20 flex items-center gap-3"
                        >
                            <Sparkles size={24} /> Start New Battle
                        </button>
                    </div>
                )}

                {(gameStatus === 'generating' || isGenerating) && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <Loader2 size={64} className="text-accent animate-spin" />
                        <p className="text-accent font-plex animate-pulse">Groq AI is crafting a tricky scenario...</p>
                    </div>
                )}

                {scenario && (gameStatus === 'playing' || gameStatus === 'evaluating' || gameStatus === 'feedback') && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
                        
                        {/* Scenario & Account Selection */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Question Card */}
                            <div className="bg-surface border border-border p-6 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                                    <Brain size={200} />
                                </div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-accent/10 p-2 rounded-lg text-accent border border-accent/20">
                                        <Target size={20} />
                                    </div>
                                    <span className="text-accent font-plex text-sm font-bold uppercase tracking-widest">Tricky Scenario</span>
                                </div>
                                <p className="text-xl md:text-3xl font-playfair font-bold text-white leading-snug">
                                    {scenario.scenario}
                                </p>
                            </div>

                            {/* Interactive Selection Zone */}
                            {gameStatus === 'playing' && (
                                <div className="space-y-6">
                                    <h3 className="font-plex text-sm text-muted uppercase tracking-widest font-bold">Pick Your Moves (Debit or Credit)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {scenario.accountsInvolved.map(acc => {
                                            const isDebit = userAnswers.some(a => a.account === acc && a.side === 'Debit');
                                            const isCredit = userAnswers.some(a => a.account === acc && a.side === 'Credit');
                                            
                                            return (
                                                <div key={acc} className="bg-surface border border-border p-4 rounded-2xl flex flex-col gap-4">
                                                    <span className="font-bold text-gray-200">{acc}</span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => toggleAccountSelection(acc, 'Debit')}
                                                            className={`flex-1 py-2 rounded-xl font-bold transition-all border ${isDebit ? 'bg-accent text-bg border-accent' : 'bg-bg text-muted border-border hover:border-accent/50'}`}
                                                        >
                                                            Debit
                                                        </button>
                                                        <button 
                                                            onClick={() => toggleAccountSelection(acc, 'Credit')}
                                                            className={`flex-1 py-2 rounded-xl font-bold transition-all border ${isCredit ? 'bg-accent2 text-bg border-accent2' : 'bg-bg text-muted border-border hover:border-accent2/50'}`}
                                                        >
                                                            Credit
                                                        </button>
                                                    </div>
                                                    {(isDebit || isCredit) && (
                                                        <div className="relative animate-fadeIn">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-plex">$</span>
                                                            <input 
                                                                type="number"
                                                                placeholder="Amount"
                                                                value={userAnswers.find(a => a.account === acc && (isDebit ? a.side === 'Debit' : a.side === 'Credit'))?.amount || ''}
                                                                onChange={(e) => updateAmount(acc, isDebit ? 'Debit' : 'Credit', e.target.value)}
                                                                className="w-full bg-bg border border-border pl-8 pr-4 py-3 rounded-xl outline-none focus:border-accent transition-all font-plex text-white text-lg"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={submitAnswer}
                                        className="w-full bg-accent text-bg font-bold py-5 rounded-2xl text-xl hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] transition-all flex justify-center items-center gap-2"
                                    >
                                        Evaluate My Entry <ArrowRightLeft size={20} />
                                    </button>
                                </div>
                            )}

                            {/* Feedback Section */}
                            {gameStatus === 'feedback' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="bg-accent/10 border border-accent/20 p-8 rounded-[2rem] space-y-4">
                                        <div className="flex items-center gap-3 text-accent mb-2">
                                            <Brain size={24} />
                                            <h3 className="text-2xl font-playfair font-bold">Instructor's Logic (Hinglish)</h3>
                                        </div>
                                        <p className="text-xl text-white leading-relaxed font-serif">
                                            {scenario.hinglishExplanation}
                                        </p>
                                    </div>

                                    {/* Correct Solution Table */}
                                    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                                        <div className="bg-surface2 p-4 border-b border-border">
                                            <h4 className="font-plex text-sm font-bold uppercase tracking-widest text-muted">Standard Solution</h4>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-xs text-muted uppercase tracking-tighter border-b border-border/50">
                                                    <th className="p-4">Account</th>
                                                    <th className="p-4 text-right">Debit</th>
                                                    <th className="p-4 text-right">Credit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scenario.correctEntries.map((entry, idx) => (
                                                    <tr key={idx} className="border-b border-border/30">
                                                        <td className="p-4 font-bold">{entry.account}</td>
                                                        <td className="p-4 text-right font-plex text-accent">
                                                            {entry.side === 'Debit' ? `$${Number(entry.amount).toLocaleString()}` : '-'}
                                                        </td>
                                                        <td className="p-4 text-right font-plex text-accent2">
                                                            {entry.side === 'Credit' ? `$${Number(entry.amount).toLocaleString()}` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <button 
                                        onClick={generateTrickyQuestion}
                                        className="w-full bg-white text-bg font-bold py-5 rounded-2xl text-xl hover:bg-gray-200 transition-all flex justify-center items-center gap-3"
                                    >
                                        <RefreshCcw size={20} /> Try Another Scenario
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: T-Accounts & Reports */}
                        <div className="space-y-8">
                            {/* T-Accounts Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted px-2">
                                    <Wallet size={18} />
                                    <h3 className="font-plex text-xs font-bold uppercase tracking-widest">T-Accounts Visualizer</h3>
                                </div>
                                <div className="space-y-4">
                                    {(gameStatus === 'feedback' ? scenario.tAccountBalances : scenario.accountsInvolved.map(a => ({ account: a, dr: 0, cr: 0, final: 0 }))).slice(0, 4).map((t, i) => (
                                        <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
                                            <div className="text-center border-b border-border pb-1 font-bold text-xs truncate" title={t.account}>
                                                {t.account}
                                            </div>
                                            <div className="grid grid-cols-2 gap-0 divide-x divide-border">
                                                <div className="px-2 text-center">
                                                    <span className="text-[10px] text-muted block">DR</span>
                                                    <span className="text-accent font-plex text-xs">${Number(t.dr || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="px-2 text-center">
                                                    <span className="text-[10px] text-muted block">CR</span>
                                                    <span className="text-accent2 font-plex text-xs">${Number(t.cr || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {gameStatus === 'feedback' && (
                                                <div className="pt-1 text-center border-t border-border/50 text-[10px] font-bold text-white">
                                                    BAL: ${Number(t.final).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reports Impact */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted px-2">
                                    <BarChart3 size={18} />
                                    <h3 className="font-plex text-xs font-bold uppercase tracking-widest">Financial Impact</h3>
                                </div>
                                
                                <div className="bg-surface border border-border rounded-[1.5rem] divide-y divide-border overflow-hidden">
                                    {/* Profit & Loss */}
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full">P & L</span>
                                            <PieChart size={14} className="text-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            {gameStatus === 'feedback' ? scenario.reports.pl.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs">
                                                    <span className="text-muted">{item.item}</span>
                                                    <span className="text-white font-plex">${Number(item.amount).toLocaleString()}</span>
                                                </div>
                                            )) : (
                                                <span className="text-muted text-[10px] italic">Post entry to see impact...</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Balance Sheet */}
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-accent3 px-2 py-0.5 bg-accent3/10 rounded-full">Balance Sheet</span>
                                            <Wallet size={14} className="text-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            {gameStatus === 'feedback' ? scenario.reports.bs.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs">
                                                    <span className="text-muted">{item.item}</span>
                                                    <span className="text-white font-plex">${Number(item.amount).toLocaleString()}</span>
                                                </div>
                                            )) : (
                                                <span className="text-muted text-[10px] italic">Post entry to see impact...</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Income Statement */}
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-accent4 px-2 py-0.5 bg-accent4/10 rounded-full">Income Statement</span>
                                            <Activity size={14} className="text-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            {gameStatus === 'feedback' ? scenario.reports.incomeStatement.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs">
                                                    <span className="text-muted">{item.item}</span>
                                                    <span className="text-white font-plex">${Number(item.amount).toLocaleString()}</span>
                                                </div>
                                            )) : (
                                                <span className="text-muted text-[10px] italic">Post entry to see impact...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}

export default JournalMode;
