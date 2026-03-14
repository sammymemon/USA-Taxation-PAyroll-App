import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, Activity, Mic, MicOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// A comprehensive American Chart of Accounts for a typical bookkeeping test/app
const CHART_OF_ACCOUNTS = [
    // --- ASSETS (1000 - 1999) ---
    // Current Assets
    "1000 - Cash",
    "1010 - Petty Cash",
    "1020 - Checking Account",
    "1030 - Savings Account",
    "1200 - Accounts Receivable",
    "1210 - Allowance for Doubtful Accounts",
    "1300 - Inventory",
    "1400 - Prepaid Expenses",
    "1410 - Prepaid Insurance",
    "1420 - Prepaid Rent",
    "1450 - Supplies",
    // Fixed/Long-Term Assets
    "1500 - Equipment",
    "1510 - Accumulated Depreciation - Equipment",
    "1600 - Furniture & Fixtures",
    "1610 - Accumulated Depreciation - Furniture",
    "1700 - Vehicles",
    "1710 - Accumulated Depreciation - Vehicles",
    "1800 - Buildings",
    "1810 - Accumulated Depreciation - Buildings",
    "1900 - Land",

    // --- LIABILITIES (2000 - 2999) ---
    // Current Liabilities
    "2000 - Accounts Payable",
    "2010 - Credit Card Payable",
    "2100 - Wages Payable",
    "2110 - Salaries Payable",
    "2150 - Payroll Taxes Payable",
    "2160 - FICA Taxes Payable",
    "2170 - Federal Unemployment Taxes Payable (FUTA)",
    "2180 - State Unemployment Taxes Payable (SUTA)",
    "2190 - State Income Tax Payable",
    "2200 - Accrued Liabilities",
    "2210 - Accrued Interest Payable",
    "2300 - Notes Payable (Short-Term)",
    "2400 - Unearned Revenue",
    "2410 - Customer Deposits",
    "2500 - Sales Tax Payable",
    // Long-Term Liabilities
    "2700 - Notes Payable (Long-Term)",
    "2800 - Mortgage Payable",
    "2900 - Bonds Payable",

    // --- EQUITY (3000 - 3999) ---
    "3000 - Common Stock",
    "3010 - Preferred Stock",
    "3050 - Additional Paid-In Capital",
    "3100 - Retained Earnings",
    "3200 - Dividends",
    "3300 - Owner's Equity / Capital",
    "3400 - Owner's Draws",

    // --- REVENUE (4000 - 4999) ---
    "4000 - Sales Revenue",
    "4010 - Product Sales",
    "4050 - Sales Returns & Allowances",
    "4060 - Sales Discounts",
    "4100 - Service Revenue",
    "4150 - Consulting Revenue",
    "4200 - Interest Income",
    "4300 - Dividend Income",
    "4400 - Rental Income",

    // --- COST OF GOODS SOLD (5000 - 5099) ---
    "5000 - Cost of Goods Sold",
    "5010 - Purchases",
    "5020 - Purchase Returns & Allowances",
    "5030 - Purchase Discounts",
    "5050 - Freight In",

    // --- EXPENSES (5100 - 5999) ---
    "5100 - Payroll Expense",
    "5110 - Salaries Expense",
    "5120 - Wages Expense",
    "5150 - Payroll Tax Expense",
    "5160 - Employee Benefits Expense",
    "5200 - Rent Expense",
    "5300 - Utilities Expense",
    "5310 - Telephone & Internet Expense",
    "5400 - Depreciation Expense",
    "5450 - Amortization Expense",
    "5500 - Advertising & Marketing Expense",
    "5510 - Website Expense",
    "5600 - Office Supplies Expense",
    "5610 - Postage & Delivery Expense",
    "5700 - Insurance Expense",
    "5710 - Maintenance & Repairs Expense",
    "5800 - Professional Fees (Legal & Accounting)",
    "5810 - Travel & Entertainment Expense",
    "5820 - Bank Service Charges",
    "5830 - Interest Expense",
    "5840 - Bad Debt Expense",
    "5900 - Miscellaneous Expense",
    "5950 - Taxes & Licenses Expense",
    
    // --- GAINS/LOSSES (7000) ---
    "7000 - Gain on Sale of Asset",
    "7100 - Loss on Sale of Asset"
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
    const [journalRows, setJournalRows] = useState([
        { account: '', debit: '', credit: '', description: '', name: '' },
        { account: '', debit: '', credit: '', description: '', name: '' }
    ]);
    
    const [evaluating, setEvaluating] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Voice Mode State
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [parsingVoice, setParsingVoice] = useState(false);
    const recognitionRef = useRef(null);

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
        setJournalRows([
            { account: '', debit: '', credit: '', description: '', name: '' },
            { account: '', debit: '', credit: '', description: '', name: '' }
        ]);

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

    const addRow = () => setJournalRows([...journalRows, { account: '', debit: '', credit: '', description: '', name: '' }]);
    const removeRow = (index) => setJournalRows(journalRows.filter((_, i) => i !== index));
    const updateRow = (index, field, value) => {
        const newRows = [...journalRows];
        if (field === 'debit' && value !== '') newRows[index].credit = '';
        if (field === 'credit' && value !== '') newRows[index].debit = '';
        newRows[index][field] = value;
        setJournalRows(newRows);
    };

    // --- Voice Mode ---
    const startVoiceEntry = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice recognition is not supported in this browser. Please use Chrome.');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceTranscript('');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceTranscript(transcript);
            parseVoiceToJournal(transcript);
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
            setIsListening(false);
            if (e.error !== 'aborted') alert('Voice recognition error: ' + e.error);
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
    };

    const parseVoiceToJournal = async (transcript) => {
        if (!groqApiKey) return alert('Please enter your Groq API Key first.');
        setParsingVoice(true);

        const prompt = `You are an expert accountant assistant. A student spoke the following journal entry out loud:
"${transcript}"

Parse this speech into structured journal entry rows. Match account names to the closest account in this Chart of Accounts:
${CHART_OF_ACCOUNTS.join(', ')}

Return ONLY valid JSON in this exact format, no explanation:
{
  "rows": [
    { "account": "1000 - Cash", "debit": 500, "credit": 0, "description": "", "name": "" },
    { "account": "4000 - Sales Revenue", "debit": 0, "credit": 500, "description": "", "name": "" }
  ]
}
Use 0 for debit or credit when not applicable.`;

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                },
                {
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            let text = response.data.choices[0].message.content || '';
            if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
            else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

            const parsed = JSON.parse(text);
            if (parsed.rows && parsed.rows.length > 0) {
                const newRows = parsed.rows.map(r => ({
                    account: r.account || '',
                    debit: r.debit > 0 ? String(r.debit) : '',
                    credit: r.credit > 0 ? String(r.credit) : '',
                    description: r.description || '',
                    name: r.name || ''
                }));
                // pad to at least 2 rows
                while (newRows.length < 2) newRows.push({ account: '', debit: '', credit: '', description: '', name: '' });
                setJournalRows(newRows);
            }
        } catch (err) {
            console.error('Voice parse error:', err);
            alert('Could not parse your voice input. Please try again or fill manually.');
        }
        setParsingVoice(false);
    };

    const submitAnswer = async () => {
        if (!groqApiKey) return alert("Please enter your Groq API Key first.");
        
        let valid = true;
        let totalDr = 0;
        let totalCr = 0;

        const cleanDr = [];
        const cleanCr = [];

        journalRows.forEach(r => {
            if (r.account && r.debit) {
                totalDr += parseFloat(r.debit) || 0;
                cleanDr.push({ account: r.account, amount: parseFloat(r.debit) });
            }
            if (r.account && r.credit) {
                totalCr += parseFloat(r.credit) || 0;
                cleanCr.push({ account: r.account, amount: parseFloat(r.credit) });
            }
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
            <div className="bg-surface/80 backdrop-blur-md border-b border-border p-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-lg hover:bg-surface2 hover:border-accent/50 transition-all text-muted hover:text-accent shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl md:text-2xl font-bold text-text flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg text-accent">
                            <Activity size={20} />
                        </div>
                        Journal Entry Mode
                    </h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
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
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-plex text-xs text-accent uppercase tracking-widest font-bold flex items-center gap-2 bg-accent/10 py-1 px-3 rounded-full">
                                Scenario
                            </h3>
                        </div>
                        <div className="text-xl md:text-2xl font-serif text-text mb-8 leading-relaxed px-5 border-l-4 border-accent bg-gradient-to-r from-accent/5 to-transparent py-5 rounded-r-xl shadow-inner">
                            {questionText}
                        </div>

                        {/* Journal Entry Form */}
                        <div className="space-y-6">
                        {/* Journal Entry Form - Premium Style */}
                        <div className="bg-bg border border-border rounded-xl shadow-inner overflow-hidden">
                            
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-surface border-b border-border text-[11px] uppercase tracking-widest font-plex text-muted">
                                            <th className="p-3 w-12 text-center border-r border-border/50">#</th>
                                            <th className="p-3 min-w-[220px] border-r border-border/50">Account</th>
                                            <th className="p-3 w-[140px] border-r border-border/50 text-right">Debits</th>
                                            <th className="p-3 w-[140px] border-r border-border/50 text-right">Credits</th>
                                            <th className="p-3 min-w-[180px] border-r border-border/50">Description</th>
                                            <th className="p-3 min-w-[150px] border-r border-border/50">Name</th>
                                            <th className="p-3 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-surface/30">
                                        {journalRows.map((row, idx) => (
                                            <tr key={idx} className="group hover:bg-surface/80 transition-colors">
                                                <td className="p-3 text-center text-muted/70 font-plex text-xs border-r border-border/50">{idx + 1}</td>
                                                <td className="p-2 border-r border-border/50">
                                                    <input 
                                                        type="text" 
                                                        list="accountsList"
                                                        value={row.account}
                                                        onChange={e => updateRow(idx, 'account', e.target.value)}
                                                        placeholder="Select account..." 
                                                        className="w-full bg-transparent border-2 border-transparent hover:bg-surface focus:bg-surface focus:border-accent/50 px-3 py-2 rounded-md text-sm text-text outline-none transition-all placeholder:text-muted/50"
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-border/50">
                                                    <input 
                                                        type="number" 
                                                        value={row.debit}
                                                        onChange={e => updateRow(idx, 'debit', e.target.value)}
                                                        placeholder="" 
                                                        className="w-full bg-transparent border-2 border-transparent hover:bg-surface focus:bg-surface focus:border-accent/50 px-3 py-2 rounded-md text-sm text-text outline-none transition-all text-right font-plex"
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-border/50">
                                                    <input 
                                                        type="number" 
                                                        value={row.credit}
                                                        onChange={e => updateRow(idx, 'credit', e.target.value)}
                                                        placeholder="" 
                                                        className="w-full bg-transparent border-2 border-transparent hover:bg-surface focus:bg-surface focus:border-accent/50 px-3 py-2 rounded-md text-sm text-text outline-none transition-all text-right font-plex"
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-border/50">
                                                    <input 
                                                        type="text" 
                                                        value={row.description}
                                                        onChange={e => updateRow(idx, 'description', e.target.value)}
                                                        placeholder="Enter description..." 
                                                        className="w-full bg-transparent border-2 border-transparent hover:bg-surface focus:bg-surface focus:border-accent/50 px-3 py-2 rounded-md text-sm text-text outline-none transition-all placeholder:text-muted/50"
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-border/50">
                                                    <input 
                                                        type="text" 
                                                        value={row.name}
                                                        onChange={e => updateRow(idx, 'name', e.target.value)}
                                                        placeholder="Employee/Vendor..." 
                                                        className="w-full bg-transparent border-2 border-transparent hover:bg-surface focus:bg-surface focus:border-accent/50 px-3 py-2 rounded-md text-sm text-text outline-none transition-all placeholder:text-muted/50"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    {journalRows.length > 2 && (
                                                        <button onClick={() => removeRow(idx)} className="text-red-500/50 hover:text-red-500 p-2 rounded-md hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Delete Line">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="block md:hidden border-b border-border/50 divide-y divide-border/50 bg-surface/30">
                                {journalRows.map((row, idx) => (
                                    <div key={idx} className="p-4 space-y-4 relative group hover:bg-surface/80 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-accent/80 font-plex text-[10px] uppercase font-bold tracking-widest bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md">Line {idx + 1}</span>
                                            {journalRows.length > 2 && (
                                                <button onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-400 p-2 rounded-md hover:bg-red-500/10 transition-all bg-surface border border-transparent shadow-sm" title="Delete Line">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1 block tracking-wider">Account</label>
                                                <input 
                                                    type="text" 
                                                    list="accountsList"
                                                    value={row.account}
                                                    onChange={e => updateRow(idx, 'account', e.target.value)}
                                                    placeholder="Select account..." 
                                                    className="w-full bg-bg border border-border focus:border-accent/50 px-4 py-3 rounded-lg text-sm text-text outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1 block tracking-wider">Debit</label>
                                                    <input 
                                                        type="number" 
                                                        value={row.debit}
                                                        onChange={e => updateRow(idx, 'debit', e.target.value)}
                                                        placeholder="$ 0.00" 
                                                        className="w-full bg-bg border border-border focus:border-accent/50 px-4 py-3 rounded-lg text-sm text-text outline-none transition-all font-plex shadow-sm"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1 block tracking-wider">Credit</label>
                                                    <input 
                                                        type="number" 
                                                        value={row.credit}
                                                        onChange={e => updateRow(idx, 'credit', e.target.value)}
                                                        placeholder="$ 0.00" 
                                                        className="w-full bg-bg border border-border focus:border-accent/50 px-4 py-3 rounded-lg text-sm text-text outline-none transition-all font-plex shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1 block tracking-wider">Description</label>
                                                    <input 
                                                        type="text" 
                                                        value={row.description}
                                                        onChange={e => updateRow(idx, 'description', e.target.value)}
                                                        placeholder="Memo..." 
                                                        className="w-full bg-bg border border-border focus:border-accent/50 px-3 py-2.5 rounded-lg text-xs text-text outline-none transition-all shadow-sm"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1 block tracking-wider">Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={row.name}
                                                        onChange={e => updateRow(idx, 'name', e.target.value)}
                                                        placeholder="Vendor..." 
                                                        className="w-full bg-bg border border-border focus:border-accent/50 px-3 py-2.5 rounded-lg text-xs text-text outline-none transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 md:p-5 border-t border-border bg-surface flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4 rounded-b-xl">
                                <button onClick={addRow} className="flex items-center justify-center gap-1 w-full md:w-auto text-sm font-plex font-bold text-accent hover:text-accent-light transition-all py-3 md:py-2 px-4 rounded-lg bg-accent/5 hover:bg-accent/10 border border-accent/20 hover:border-accent/40 shadow-sm">
                                    <Plus size={16} /> Add lines
                                </button>
                                
                                <div className="flex justify-between w-full md:w-auto md:gap-10 px-2 md:px-6 font-plex text-sm bg-bg md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-border md:border-none shadow-sm md:shadow-none">
                                    <div className="flex justify-between md:flex-col items-center md:items-end w-full md:w-auto gap-4 md:gap-1">
                                        <div className="flex flex-col items-start md:items-end gap-1">
                                            <span className="text-muted/80 text-[10px] uppercase font-bold tracking-widest">Total Debits</span>
                                            <span className="font-bold text-text text-lg">${journalRows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0).toFixed(2)}</span>
                                        </div>
                                        <div className="hidden md:block w-px h-8 bg-border/50 mx-2"></div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-muted/80 text-[10px] uppercase font-bold tracking-widest">Total Credits</span>
                                            <span className="font-bold text-text text-lg">${journalRows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                            
                            <datalist id="accountsList">
                                {CHART_OF_ACCOUNTS.map(acc => <option key={acc} value={acc} />)}
                            </datalist>

                        </div>

                        {/* Voice Entry Section */}
                        <div className={`rounded-2xl border p-5 transition-all duration-300 ${isListening ? 'border-red-500/60 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : parsingVoice ? 'border-accent/60 bg-accent/5 shadow-[0_0_30px_rgba(var(--accent-rgb),0.08)]' : 'border-border bg-surface'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-plex font-bold text-text text-sm flex items-center gap-2">
                                        <Mic size={16} className={isListening ? 'text-red-500' : 'text-accent'} />
                                        Voice Entry
                                    </h4>
                                    <p className="font-plex text-xs text-muted mt-0.5">
                                        Speak your journal entry and AI will fill the table
                                    </p>
                                </div>
                                <button
                                    onClick={startVoiceEntry}
                                    disabled={parsingVoice}
                                    className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-plex font-bold text-sm transition-all shadow-md ${
                                        isListening
                                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30'
                                            : parsingVoice
                                            ? 'bg-accent/50 text-bg cursor-not-allowed'
                                            : 'bg-accent text-bg hover:bg-accent/90 shadow-accent/20'
                                    }`}
                                >
                                    {isListening && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                    {parsingVoice ? (
                                        <><Loader2 size={16} className="animate-spin" /> AI Parsing...</>
                                    ) : isListening ? (
                                        <><MicOff size={16} /> Stop Recording</>
                                    ) : (
                                        <><Mic size={16} /> Start Voice Entry</>
                                    )}
                                </button>
                            </div>

                            {/* Instructions */}
                            {!isListening && !voiceTranscript && !parsingVoice && (
                                <div className="text-xs font-plex text-muted bg-bg border border-border rounded-xl p-4 space-y-1.5">
                                    <p className="font-bold text-text mb-2">💡 How to speak your entry:</p>
                                    <p>🟢 <span className="text-text">"Debit Cash one thousand, Credit Sales Revenue one thousand"</span></p>
                                    <p>🟢 <span className="text-text">"Debit Rent Expense five hundred, Credit Cash five hundred"</span></p>
                                    <p>🟢 <span className="text-text">"Debit Accounts Receivable 2500 Credit Service Revenue 2500"</span></p>
                                </div>
                            )}

                            {/* Listening Animation */}
                            {isListening && (
                                <div className="flex flex-col items-center justify-center py-6 gap-4">
                                    <div className="flex items-end gap-1 h-12">
                                        {[1,2,3,4,5,6,7].map(i => (
                                            <div
                                                key={i}
                                                className="w-2 bg-red-500 rounded-full"
                                                style={{
                                                    height: `${Math.random() * 60 + 20}%`,
                                                    animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <p className="font-plex text-sm text-red-500 font-bold animate-pulse">🎙 Listening... Speak your journal entry</p>
                                </div>
                            )}

                            {/* Transcript */}
                            {voiceTranscript && !isListening && (
                                <div className="mt-3 bg-bg border border-border rounded-xl p-4">
                                    <p className="text-[10px] font-plex text-muted uppercase tracking-widest mb-2 font-bold">You said:</p>
                                    <p className="font-serif text-text text-base italic">"{voiceTranscript}"</p>
                                    {!parsingVoice && (
                                        <p className="text-xs font-plex text-accent mt-2 flex items-center gap-1">
                                            <CheckCircle size={12} /> Journal table has been filled from your voice input
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {!feedback && (
                            <button 
                                onClick={submitAnswer}
                                disabled={evaluating}
                                className={`w-full font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-lg ${evaluating ? 'bg-accent/50 cursor-not-allowed animate-pulse text-[#0f0e0d]' : 'bg-surface2 border border-accent text-accent hover:bg-accent hover:text-[#0f0e0d]'}`}
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

                        <div className="bg-surface font-plex border border-border p-6 rounded-xl text-text leading-relaxed text-[15px] mb-8 shadow-inner">
                            {feedback.feedback}
                        </div>

                        <div className="bg-bg border border-border rounded-xl mb-6 overflow-hidden shadow-sm">
                            <div className="bg-surface py-3 px-5 border-b border-border">
                                <h4 className="font-plex text-xs uppercase tracking-widest text-accent font-bold">Standard Correct Entry</h4>
                            </div>
                            <div className="p-5 space-y-3 font-plex text-[14px]">
                                {feedback.correctDr && feedback.correctDr.map((dr, i) => (
                                    <div key={'dr'+i} className="flex justify-between items-center border-b border-border/30 pb-3">
                                        <span className="flex items-center gap-3"><span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-xs">Dr.</span><span className="font-medium">{dr.account}</span></span>
                                        <span className="font-bold">${(dr.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                                {feedback.correctCr && feedback.correctCr.map((cr, i) => (
                                    <div key={'cr'+i} className="flex justify-between items-center border-b border-border/30 pb-3 pl-8">
                                        <span className="flex items-center gap-3"><span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded text-xs">Cr.</span><span className="font-medium text-muted">{cr.account}</span></span>
                                        <span className="font-bold text-muted">${(cr.amount || 0).toLocaleString()}</span>
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
