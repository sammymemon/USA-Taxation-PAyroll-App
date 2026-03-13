import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const CHART_OF_ACCOUNTS = [
    "1000 - Cash",
    "1200 - Accounts Receivable",
    "1300 - Inventory",
    "1400 - Prepaid Expenses",
    "1500 - Equipment",
    "1550 - Accumulated Depreciation",
    "2000 - Accounts Payable",
    "2100 - Wages Payable",
    "2150 - Payroll Taxes Payable",
    "2200 - Accrued Liabilities",
    "2300 - Notes Payable",
    "2400 - Unearned Revenue",
    "3000 - Common Stock",
    "3100 - Retained Earnings",
    "3200 - Dividends",
    "4000 - Sales Revenue",
    "4100 - Service Revenue",
    "4200 - Interest Income",
    "5000 - Cost of Goods Sold",
    "5100 - Payroll Expense",
    "5150 - Payroll Tax Expense",
    "5200 - Rent Expense",
    "5300 - Utilities Expense",
    "5400 - Depreciation Expense",
    "5900 - Miscellaneous Expense"
];

function JournalMode() {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('Beginner');
    
    const [loadingCategories, setLoadingCategories] = useState(true);
    
    // Groq Config
    const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    
    // Entry State
    const [generatingText, setGeneratingText] = useState(false);
    const [questionText, setQuestionText] = useState('');
    const [drRows, setDrRows] = useState([{ account: '', amount: '' }]);
    const [crRows, setCrRows] = useState([{ account: '', amount: '' }]);
    
    const [evaluating, setEvaluating] = useState(false);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                let catData;
                try {
                    const res = await axios.get('/data.json');
                    catData = res.data.categories;
                } catch (e) {
                    const res = await axios.get('/api/data');
                    catData = res.data.categories;
                }
                setCategories(catData || []);
                if (catData && catData.length > 0) {
                    setSelectedCategory(catData[0].name);
                }
                setLoadingCategories(false);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    const generateQuestion = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key at the bottom.");
        if (!selectedCategory) return alert("Please select a category.");

        setGeneratingText(true);
        setQuestionText('');
        setFeedback(null);
        setDrRows([{ account: '', amount: '' }]);
        setCrRows([{ account: '', amount: '' }]);

        const prompt = `You are a practical accounting test generator. Generate ONE short journal entry scenario for American bookkeeping in the category "${selectedCategory}" at the "${selectedLevel}" level. 
        It must contain exact dollar amounts so the user can answer it. 
        DO NOT PROVIDE THE ANSWER, JUST THE PRACTICAL SCENARIO OR QUESTION. 
        Example format: "You paid $500 cash for office rent for the month."
        Output only the text of the scenario.`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 150,
                    temperature: 0.7
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            
            setQuestionText(response.data.choices[0].message.content.trim().replace(/^"|"$/g, ''));
        } catch (error) {
            console.error(error);
            alert("Failed to generate question from Groq. Check your API key.");
        }
        setGeneratingText(false);
    };

    const addDrRow = () => setDrRows([...drRows, { account: '', amount: '' }]);
    const removeDrRow = (index) => setDrRows(drRows.filter((_, i) => i !== index));
    const updateDrRow = (index, field, value) => {
        const newRows = [...drRows];
        newRows[index][field] = value;
        setDrRows(newRows);
    };

    const addCrRow = () => setCrRows([...crRows, { account: '', amount: '' }]);
    const removeCrRow = (index) => setCrRows(crRows.filter((_, i) => i !== index));
    const updateCrRow = (index, field, value) => {
        const newRows = [...crRows];
        newRows[index][field] = value;
        setCrRows(newRows);
    };

    const submitAnswer = async () => {
        if (!groqApiKey) return alert("Please enter your Groq API Key first.");
        
        let valid = true;
        let totalDr = 0;
        let totalCr = 0;

        const cleanDr = drRows.filter(r => r.account && r.amount).map(r => {
            totalDr += parseFloat(r.amount) || 0;
            return { account: r.account, amount: parseFloat(r.amount) };
        });
        
        const cleanCr = crRows.filter(r => r.account && r.amount).map(r => {
            totalCr += parseFloat(r.amount) || 0;
            return { account: r.account, amount: parseFloat(r.amount) };
        });

        if (cleanDr.length === 0 || cleanCr.length === 0) {
            return alert("Please enter at least one complete Debit and one complete Credit row.");
        }

        if (totalDr !== totalCr) {
            if (!window.confirm(`Your Debits ($${totalDr}) and Credits ($${totalCr}) do not balance! Submit anyway?`)) {
                return;
            }
        }

        setEvaluating(true);
        setFeedback(null);

        const userJournalEntry = `Debits:\n${cleanDr.map(d => '- ' + d.account + ' / $' + d.amount).join('\n')}\nCredits:\n${cleanCr.map(c => '- ' + c.account + ' / $' + c.amount).join('\n')}`;
        
        const prompt = `Act as an expert accounting instructor.
Question Scenario: ${questionText}
User's Answer:
${userJournalEntry}

Is the user's journal entry correct regarding the selected accounts, their debits/credits orientation, and the amounts?
Provide your evaluation and standard solution in JSON format ONLY:
{
  "isCorrect": boolean,
  "feedback": "Detailed explanation of exactly what is right or wrong.",
  "correctDr": [{"account": "string", "amount": number}],
  "correctCr": [{"account": "string", "amount": number}]
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            let generatedText = response.data.choices[0].message.content || "";
            if (generatedText.includes('```json')) {
                generatedText = generatedText.split('```json')[1].split('```')[0].trim();
            } else if (generatedText.includes('```')) {
                generatedText = generatedText.split('```')[1].split('```')[0].trim();
            }

            const resultData = JSON.parse(generatedText);
            setFeedback(resultData);
        } catch (error) {
            console.error("AI Evaluation Error", error);
            alert("Failed to evaluate with AI. The JSON parser might have failed.");
        }
        setEvaluating(false);
    };

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <div className="bg-surface border-b border-border p-6 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl md:text-2xl font-bold text-accent flex items-center gap-2">
                        <Activity size={24} /> Journal Entry Mode
                    </h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
                {/* Control Panel */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-playfair font-bold text-text mb-4">Generate Question</h2>
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <label className="block text-xs font-plex text-muted uppercase tracking-widest mb-2">Category</label>
                            <select 
                                value={selectedCategory} 
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="w-full bg-bg border border-border px-4 py-3 rounded-lg text-text font-serif focus:border-accent outline-none appearance-none"
                            >
                                {loadingCategories ? <option>Loading...</option> : categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-plex text-muted uppercase tracking-widest mb-2">Level</label>
                            <select 
                                value={selectedLevel} 
                                onChange={e => setSelectedLevel(e.target.value)}
                                className="w-full bg-bg border border-border px-4 py-3 rounded-lg text-text font-serif focus:border-accent outline-none appearance-none"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        onClick={generateQuestion}
                        disabled={generatingText}
                        className={`w-full bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${generatingText ? 'opacity-70 animate-pulse cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                    >
                        {generatingText ? "🤖 Generating Question..." : "✨ Generate new Journal Entry Scenario"}
                    </button>
                </div>

                {/* Interaction Area */}
                {questionText && (
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg animate-fadeIn">
                        <h3 className="font-plex text-sm text-accent uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                            Scenario:
                        </h3>
                        <div className="text-xl md:text-2xl font-serif text-text mb-8 leading-relaxed px-4 border-l-4 border-accent bg-accent/5 py-4 rounded-r-lg">
                            {questionText}
                        </div>

                        {/* Journal Entry Form */}
                        <div className="space-y-6">
                            {/* Debits */}
                            <div className="bg-surface2/30 border border-border rounded-xl p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-plex text-sm text-green-500 uppercase tracking-widest font-bold">Dr. (Debit)</h4>
                                </div>
                                <div className="space-y-3">
                                    {drRows.map((row, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    list="accountsList"
                                                    value={row.account}
                                                    onChange={e => updateDrRow(idx, 'account', e.target.value)}
                                                    placeholder="Account Code / Name" 
                                                    className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                                                />
                                            </div>
                                            <div className="w-[120px]">
                                                <input 
                                                    type="number" 
                                                    value={row.amount}
                                                    onChange={e => updateDrRow(idx, 'amount', e.target.value)}
                                                    placeholder="$ Amount" 
                                                    className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                                                />
                                            </div>
                                            {drRows.length > 1 && (
                                                <button onClick={() => removeDrRow(idx)} className="text-red-500 hover:text-red-400 p-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addDrRow} className="mt-4 flex items-center gap-1 text-sm font-plex text-muted hover:text-green-500 transition-colors">
                                    <Plus size={16} /> Add Debit Line
                                </button>
                            </div>

                            {/* Credits */}
                            <div className="bg-surface2/30 border border-border rounded-xl p-5 ml-0 md:ml-12 border-l-4 border-l-red-500/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-plex text-sm text-red-500 uppercase tracking-widest font-bold">Cr. (Credit)</h4>
                                </div>
                                <div className="space-y-3">
                                    {crRows.map((row, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    list="accountsList"
                                                    value={row.account}
                                                    onChange={e => updateCrRow(idx, 'account', e.target.value)}
                                                    placeholder="Account Code / Name" 
                                                    className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                                                />
                                            </div>
                                            <div className="w-[120px]">
                                                <input 
                                                    type="number" 
                                                    value={row.amount}
                                                    onChange={e => updateCrRow(idx, 'amount', e.target.value)}
                                                    placeholder="$ Amount" 
                                                    className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                                                />
                                            </div>
                                            {crRows.length > 1 && (
                                                <button onClick={() => removeCrRow(idx)} className="text-red-500 hover:text-red-400 p-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addCrRow} className="mt-4 flex items-center gap-1 text-sm font-plex text-muted hover:text-red-500 transition-colors">
                                    <Plus size={16} /> Add Credit Line
                                </button>
                            </div>
                            
                            <datalist id="accountsList">
                                {CHART_OF_ACCOUNTS.map(acc => <option key={acc} value={acc} />)}
                            </datalist>

                        </div>

                        {!feedback && (
                            <button 
                                onClick={submitAnswer}
                                disabled={evaluating}
                                className={`mt-8 w-full font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-lg ${evaluating ? 'bg-accent/50 cursor-not-allowed animate-pulse text-[#0f0e0d]' : 'bg-surface2 border border-accent text-accent hover:bg-accent hover:text-[#0f0e0d]'}`}
                            >
                                {evaluating ? "🤖 AI Evaluating Journal Entry..." : "Submit Answer"}
                            </button>
                        )}
                    </div>
                )}

                {/* AI Feedback Form */}
                {feedback && (
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg animate-fadeIn mt-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-full flex items-center justify-center ${feedback.isCorrect ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}>
                                {feedback.isCorrect ? <CheckCircle size={32} /> : <RefreshCcw size={32} />}
                            </div>
                            <div>
                                <h3 className={`font-playfair text-2xl font-bold ${feedback.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                    {feedback.isCorrect ? 'Correct Entry!' : 'Incorrect / Needs Fixing'}
                                </h3>
                                <p className="font-plex text-sm text-text mt-1">AI Evaluator</p>
                            </div>
                        </div>

                        <div className="bg-surface2/50 border border-border p-5 rounded-xl text-text leading-relaxed font-serif text-lg mb-6">
                            {feedback.feedback}
                        </div>

                        <div className="bg-bg border border-border rounded-xl p-5 mb-6 opacity-90">
                            <h4 className="font-plex text-xs uppercase tracking-widest text-accent mb-4 font-bold">Standard Correct Entry</h4>
                            <div className="space-y-4 font-plex text-[14px]">
                                {feedback.correctDr && feedback.correctDr.map((dr, i) => (
                                    <div key={'dr'+i} className="flex justify-between border-b border-border/50 pb-2">
                                        <span><span className="text-green-500 font-bold mr-2">Dr.</span>{dr.account}</span>
                                        <span>$\{(dr.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                                {feedback.correctCr && feedback.correctCr.map((cr, i) => (
                                    <div key={'cr'+i} className="flex justify-between border-b border-border/50 pb-2 pl-8">
                                        <span><span className="text-red-500 font-bold mr-2">Cr.</span>{cr.account}</span>
                                        <span>$\{(cr.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <button 
                            onClick={generateQuestion}
                            className="bg-surface2 border border-border hover:border-accent text-accent font-bold py-4 px-6 rounded-xl transition-colors flex justify-center items-center gap-2 w-full"
                        >
                            Try Another Question
                        </button>
                    </div>
                )}


                {/* API Key Setup */}
                <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-lg mt-12 bg-surface2/30">
                    <h5 className="font-plex text-sm text-text font-semibold mb-2 flex items-center gap-2">
                        🔑 Groq API Access (Required for GenAI)
                    </h5>
                    <p className="text-[12px] font-serif text-muted mb-4">
                        To dynamically generate questions and evaluate journal entries, provide your free Groq API key.
                    </p>
                    <div className="flex gap-2 w-full max-w-sm">
                        <input 
                            type="password" 
                            placeholder="gsk_xxxxxxxx..."
                            value={groqApiKey}
                            onChange={(e) => {
                                setGroqApiKey(e.target.value);
                                localStorage.setItem('groqApiKey', e.target.value);
                            }}
                            className="flex-1 bg-bg border border-border px-3 py-2 rounded-lg text-[13px] font-plex outline-none focus:border-accent"
                        />
                        {groqApiKey && <span className="text-green-500 border border-green-500/20 bg-green-500/10 px-3 py-2 rounded-md font-plex text-xs font-bold">Configured ✔</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JournalMode;
