import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, Trash2, CheckCircle, RefreshCcw, Activity, Mic, MicOff, Loader2, Sparkles, BookOpen, Target, Brain } from 'lucide-react';
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

const LEARNING_TOPICS = [
    // --- PAYROLL & TAXES ---
    "FICA Taxes (Social Security & Medicare)",
    "FUTA and SUTA Taxes (Federal & State Unemployment)",
    "Net Pay Calculation & Statutory Withholdings",
    "Payroll Tax Liabilities (Employer vs Employee Match)",
    "Form 941 Quarterly Payroll Taxes & Deposits",
    "Form 940 Annual FUTA Return",
    "W-2 vs 1099-NEC Contractor Payments",
    "Overtime Pay Calculation (Time and a Half)",
    "Payroll Garnishments (Child Support, Tax Levies)",
    "Pre-Tax Deductions (FSA, Dependent Care, Commuter)",
    "HSA Contributions and Employer Matching",
    "401(k) and 403(b) Retirement Plan Contributions",
    "Group Term Life Insurance (Imputed Income above $50k)",
    "Worker's Compensation Insurance Accrual",
    "Stock Options (ISOs vs NSOs) for Payroll",
    "Restricted Stock Units (RSUs) & Taxes",
    "Advance Salary & Employee Short-Term Loans",
    "Reimbursable Employee Expenses (Accountable Plans)",
    "COBRA Insurance Payments Processing",

    // --- ACCRUALS & REVENUES ---
    "Accrued Expenses vs Accrued Revenue",
    "Deferred/Unearned Revenue (Subscription Models)",
    "Sales Tax Payable & Liability Recognition",
    "Sales Tax Exemption (Resale Certificates)",
    "Use Tax Accruals on Out-Of-State Purchases",
    "Recognizing Revenue under ASC 606 (5-Step Model)",
    "Accruing Year-End Bonuses & Profit-Sharing",
    "Gift Cards & Unredeemed Balances (Breakage)",
    "Sales Returns & Allowances (Contra-Revenue)",
    "Sales Discounts (Early Payment e.g., 2/10 Net 30)",
    "Purchase Discounts & Purchase Returns",

    // --- ASSETS & LIABILITIES ---
    "Prepaid Expenses & Amortization (Insurance, Rent)",
    "Capitalizing vs Expensing Fixed Assets (Thresholds)",
    "Depreciation (Straight-Line & Accumulated)",
    "MACRS Depreciation (Basics for USA Tax)",
    "Gain/Loss on Disposal or Sale of Equipment",
    "Amortization of Intangible Assets (Patents, Trademarks)",
    "Bad Debts (Allowance for Doubtful Accounts)",
    "Direct Write-offs of Uncollectible Receivables",
    "Inventory Costing Methods (FIFO, LIFO, Weighted Average)",
    "Inventory Shrinkage & Write-Downs",
    "Invoice Factoring & Accounts Receivable Financing",
    "Bank Reconciliation Discrepancies & Adjustments",
    "Petty Cash Replenishment & Over/Short",
    "Credit Card Merchant Fees & Processing Costs",
    "Lease Accounting (ASC 842 - Operating vs Finance Leases)",
    "Accounting for PPP or SBA Loans & Forgiveness",
    "Short-term Notes Payable & Accrued Interest",
    "Customer Deposits vs Unearned Revenue",

    // --- EQUITY & OTHERS ---
    "Declaring and Paying Dividends (Common & Preferred)",
    "Owner's Draws vs W-2 Wages (S-Corp vs LLC)",
    "Capital Contributions (Additional Paid-In Capital)",
    "Treasury Stock Purchases",
    "Intercompany Transactions (Due To / Due From)",
    "Foreign Currency Transactions (FX Gains/Losses)",
    "Year-End Closing Procedures (Temporary vs Permanent Accounts)",
    "Prior Period Adjustments & Retained Earnings"
];

function JournalMode() {
    const [topicIndex, setTopicIndex] = useState(() => {
        const saved = localStorage.getItem('journalTopicIndex');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [topicName, setTopicName] = useState('');
    const [lesson, setLesson] = useState('');

    // Groq Config
    const [groqApiKey, setGroqApiKey] = useState(() => (localStorage.getItem('groqApiKey') || '').trim());

    // Entry State
    const [generatingText, setGeneratingText] = useState(false);
    const [questionText, setQuestionText] = useState('');
    const [journalRows, setJournalRows] = useState([
        { account: '', debit: '', credit: '', description: '', name: '' },
        { account: '', debit: '', credit: '', description: '', name: '' }
    ]);

    const [evaluating, setEvaluating] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [hint, setHint] = useState('');
    const [gettingHint, setGettingHint] = useState(false);

    // Voice Mode State
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [parsingVoice, setParsingVoice] = useState(false);
    const recognitionRef = useRef(null);

    // Topic and Scenario generation is fully AI-driven based on USA concepts.

    const generateTopic = async () => {
        if (!groqApiKey) return alert("Please enter your free Groq API Key at the bottom.");

        setGeneratingText(true);
        setQuestionText('');
        setLesson('');
        setTopicName('');
        setFeedback(null);
        setHint('');
        setJournalRows([
            { account: '', debit: '', credit: '', description: '', name: '' },
            { account: '', debit: '', credit: '', description: '', name: '' }
        ]);

        const currentTopic = LEARNING_TOPICS[topicIndex % LEARNING_TOPICS.length];

        const prompt = `You are an expert USA Bookkeeping & Payroll tutor.
1. The specific tricky USA bookkeeping or payroll concept you MUST teach is: "${currentTopic}".
2. Teach this concept very simply in easy Hinglish (Hindi mixed with English) under "lesson". Keep it to 1 solid, encouraging paragraph.
3. Provide a practical journal entry scenario to test their understanding about "${currentTopic}" under "question". Use exact dollar amounts.
Output ONLY raw JSON format: {"topicName": "${currentTopic}", "lesson": "...", "question": "..."}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.8,
                    max_tokens: 400,
                    response_format: { type: "json_object" }
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );

            let text = response.data.choices[0].message.content || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
            setTopicName(parsed.topicName || currentTopic);
            setLesson(parsed.lesson || '');
            setQuestionText(parsed.question || '');

            // Move to next topic
            const nextIndex = (topicIndex + 1) % LEARNING_TOPICS.length;
            setTopicIndex(nextIndex);
            localStorage.setItem('journalTopicIndex', nextIndex.toString());
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.error?.message || error.message || "Check API Key or try again.";
            alert(`Failed to generate learning topic from Groq.\nReason: ${errMsg}`);
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

    // --- Voice Mode (Groq Whisper) ---
    const startVoiceEntry = async () => {
        if (isListening) {
            recognitionRef.current?.stream?.getTracks().forEach(t => t.stop());
            recognitionRef.current?.recorder?.stop();
            return;
        }

        if (!groqApiKey) return alert('Please enter your Groq API Key first.');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks = [];

            recognitionRef.current = { stream, recorder };
            setIsListening(true);
            setVoiceTranscript('');

            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                setIsListening(false);
                setParsingVoice(true);

                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.webm');
                formData.append('model', 'whisper-large-v3-turbo');
                formData.append('language', 'en');

                try {
                    const whisperRes = await axios.post(
                        'https://api.groq.com/openai/v1/audio/transcriptions',
                        formData,
                        {
                            headers: {
                                'Authorization': `Bearer ${groqApiKey}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                    const transcript = whisperRes.data.text || '';
                    setVoiceTranscript(transcript);
                    if (transcript) parseVoiceToJournal(transcript);
                    else alert('No speech detected. Please try again.');
                } catch (err) {
                    console.error('Groq Whisper error:', err);
                    alert('Groq Whisper transcription failed. Check your API key.');
                    setParsingVoice(false);
                }
            };

            recorder.start();

            // Auto-stop after 15 seconds
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, 15000);

        } catch (err) {
            console.error('Microphone error:', err);
            alert('Could not access microphone. Please allow microphone permission.');
            setIsListening(false);
        }
    };

    const parseVoiceToJournal = async (transcript) => {
        if (!groqApiKey) return alert('Please enter your Groq API Key first.');
        setParsingVoice(true);

        const prompt = `You are a highly skilled accounting AI assistant. Your ONLY job is to convert spoken journal entry text into structured JSON.

SPOKEN TRANSCRIPT:
"${transcript}"

CONTEXT - The question scenario the student is answering:
"${questionText}"

RULES:
1. Identify every DEBIT and CREDIT account mentioned.
2. Convert ALL spoken/written numbers to numeric values:
   - "one thousand" → 1000
   - "five hundred" → 500
   - "two thousand five hundred" → 2500
   - "1,500" → 1500
3. Match each account name to the CLOSEST account from this Chart of Accounts:
${CHART_OF_ACCOUNTS.slice(0, 40).join('\n')}
${CHART_OF_ACCOUNTS.slice(40).join('\n')}
4. For each row: set "debit" to the dollar amount if it is a debit entry, else 0. Set "credit" to the dollar amount if it is a credit entry, else 0. NEVER have both debit and credit non-zero in the same row.
5. The total debits MUST equal total credits.
6. Return ONLY raw JSON — no markdown, no explanation, no code fences.

EXAMPLE INPUT: "debit cash one thousand, credit sales revenue one thousand"
EXAMPLE OUTPUT:
{"rows":[{"account":"1000 - Cash","debit":1000,"credit":0,"description":"","name":""},{"account":"4000 - Sales Revenue","debit":0,"credit":1000,"description":"","name":""}]}

NOW PARSE THE TRANSCRIPT AND RETURN JSON ONLY:`;

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an accounting AI that ONLY outputs valid JSON. Never output anything other than a raw JSON object. No markdown. No explanation.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.0,
                    max_tokens: 800,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            let text = response.data.choices[0].message.content || '';
            // Strip any accidental markdown fences
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            // Extract first valid JSON object
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');

            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.rows && parsed.rows.length > 0) {
                const newRows = parsed.rows.map(r => ({
                    account: r.account || '',
                    debit: parseFloat(r.debit) > 0 ? String(parseFloat(r.debit)) : '',
                    credit: parseFloat(r.credit) > 0 ? String(parseFloat(r.credit)) : '',
                    description: r.description || '',
                    name: r.name || ''
                }));
                while (newRows.length < 2) newRows.push({ account: '', debit: '', credit: '', description: '', name: '' });
                setJournalRows(newRows);
            } else {
                alert('AI could not identify any journal entries from your voice. Please try speaking more clearly, e.g. "Debit Cash 1000, Credit Sales Revenue 1000"');
            }
        } catch (error) {
            console.error('Voice parse error:', error);
            const errMsg = error.response?.data?.error?.message || error.message || "Check your API key.";
            alert(`Could not parse your voice input.\nReason: ${errMsg}`);
        }
        setParsingVoice(false);
    };

    const getHint = async () => {
        if (!groqApiKey) return alert("Please enter your Groq API Key first.");
        if (!questionText) return;
        setGettingHint(true);
        const prompt = `You are a helpful accounting tutor. The student is trying to solve this journal entry: "${questionText}". 
        Give them a VERY brief clue in simple Hinglish (Hindi mixed with English) about which accounts might be involved, BUT do not give them the full exact answer. Maximum 2 sentences.`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 100
                },
                { headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" } }
            );
            setHint(response.data.choices[0].message.content.replace(/^"|"$/g, '').trim());
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.error?.message || error.message || "Check API Key.";
            alert(`Could not load hint.\nReason: ${errMsg}`);
        }
        setGettingHint(false);
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

        const prompt = `Act as an expert USA accounting instructor.
Question Scenario: ${questionText}
User's Answer:
${userJournalEntry}

CRITICAL INSTRUCTION: Analyze the user's journal entry. If they are wrong, patiently TEACH them exactly where they went wrong, why, and how to correct it step-by-step. All feedback MUST be in simple Hinglish (Hindi mixed with English).

Provide your evaluation and standard solution in JSON format ONLY:
{
  "isCorrect": boolean,
  "feedback": "<Detailed step-by-step teaching explanation of what is right or wrong, entirely in easy Hinglish>",
  "correctDr": [{"account": "string", "amount": number}],
  "correctCr": [{"account": "string", "amount": number}]
}`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            let generatedText = response.data.choices[0].message.content || "";
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            const resultData = JSON.parse(jsonMatch ? jsonMatch[0] : generatedText);
            setFeedback(resultData);
        } catch (error) {
            console.error("AI Evaluation Error", error);
            const errMsg = error.response?.data?.error?.message || error.message || "The JSON parser might have failed.";
            alert(`Failed to evaluate with AI.\nReason: ${errMsg}`);
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

            <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
                {/* Initial Screen: Ready to Learn */}
                {!questionText && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-surface to-bg border border-border/50 rounded-3xl md:rounded-[2rem] p-6 sm:p-12 md:p-20 shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center animate-fadeIn group z-10">
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-1000"></div>
                        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-all duration-1000"></div>

                        <div className="relative z-10">
                            <div className="p-6 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl w-28 h-28 flex items-center justify-center mx-auto mb-8 text-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-accent/20 backdrop-blur-xl group-hover:scale-110 transition-transform duration-500">
                                <Sparkles size={48} className="drop-shadow-lg" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-4 md:mb-6 tracking-tight">Master USA Bookkeeping</h2>
                            <p className="text-muted/80 font-plex text-sm md:text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                                Experience a dynamic AI-powered session. We will teach you tricky USA Accounting & Payroll concepts in easy Hinglish, followed by a real-world scenario to test your knowledge.
                            </p>

                            <button
                                onClick={generateTopic}
                                disabled={generatingText}
                                className={`w-full max-w-sm mx-auto bg-gradient-to-r from-accent to-accent-light text-[#0f0e0d] font-bold py-5 px-8 rounded-2xl transition-all shadow-[0_0_40px_rgba(var(--accent-rgb),0.3)] flex items-center justify-center gap-3 text-lg ${generatingText ? 'opacity-70 animate-pulse cursor-not-allowed' : 'hover:scale-[1.04] hover:shadow-[0_0_60px_rgba(var(--accent-rgb),0.5)]'}`}
                            >
                                {generatingText ? <><Loader2 className="animate-spin" size={24} /> Parsing Topic...</> : <><BookOpen size={24} /> Teach & Test Me Now</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Interaction Area (Visible after generation) */}
                {questionText && (
                    <div className="space-y-8 animate-fadeIn">

                        {/* The Lesson Panel */}
                        <div className="bg-gradient-to-br from-surface to-surface/50 border border-border/80 rounded-3xl md:rounded-[2rem] p-5 md:p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                <BookOpen size={140} />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="bg-accent/20 p-2.5 rounded-xl text-accent border border-accent/20">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="font-plex text-sm text-accent uppercase tracking-[0.2em] font-bold">
                                    Topic: {topicName}
                                </h3>
                            </div>
                            <div className="relative z-10 text-base md:text-xl font-serif text-text leading-relaxed px-4 sm:px-8 border-l-[4px] md:border-l-[6px] border-accent bg-gradient-to-r from-accent/10 via-accent/5 to-transparent py-4 md:py-6 rounded-r-2xl shadow-inner backdrop-blur-sm">
                                <p className="mb-4 font-bold opacity-70 uppercase text-xs tracking-widest font-plex flex items-center gap-2">
                                    <Brain size={14} /> Instructor's Lesson (Hinglish):
                                </p>
                                <p className="text-gray-100 drop-shadow-sm">{lesson}</p>
                            </div>
                        </div>

                        {/* Practical Question / Scenario Panel */}
                        <div className="bg-surface/80 border border-border/80 rounded-3xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="bg-yellow-500/20 p-2.5 rounded-xl text-yellow-500 border border-yellow-500/20">
                                        <Target size={20} />
                                    </div>
                                    <h3 className="font-plex text-sm text-yellow-500 uppercase tracking-[0.2em] font-bold">
                                        Scenario to Solve
                                    </h3>
                                </div>
                                <button
                                    onClick={getHint}
                                    disabled={gettingHint || hint}
                                    className={`w-full sm:w-auto justify-center text-xs font-bold font-plex px-5 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-lg ${hint ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-bg border border-border text-muted hover:text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/10'}`}
                                >
                                    {gettingHint ? <><Loader2 size={14} className="animate-spin" /> Digging...</> : hint ? "💡 Hint Unlocked" : "💡 Need a Clue?"}
                                </button>
                            </div>
                            {hint && (
                                <div className="mb-6 p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-base font-serif text-yellow-500 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                                    <span className="mt-1 text-xl">💡</span>
                                    <p className="leading-relaxed">{hint}</p>
                                </div>
                            )}
                            <div className="text-xl md:text-3xl font-playfair font-bold text-white mb-8 md:mb-10 leading-snug px-1 md:px-2">
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
                                                    <th className="p-3 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50 bg-surface/30">
                                                {journalRows.map((row, idx) => (
                                                    <tr key={idx} className="group hover:bg-surface/80 transition-colors">
                                                        <td className="p-3 text-center text-muted/70 font-plex text-xs border-r border-border/50">{idx + 1}</td>
                                                        <td className="p-2 border-r border-border/50">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    list="accountsList"
                                                                    value={row.account}
                                                                    onChange={e => updateRow(idx, 'account', e.target.value)}
                                                                    placeholder="Select account..."
                                                                    className="w-full bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-accent focus:shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] px-3 py-2.5 rounded-lg text-sm text-text outline-none transition-all placeholder:text-muted/50"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 border-r border-border/50">
                                                            <div className="relative flex items-center">
                                                                <span className="absolute left-3 text-muted/50 pointer-events-none w-4 font-plex">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={row.debit}
                                                                    onChange={e => updateRow(idx, 'debit', e.target.value)}
                                                                    placeholder=""
                                                                    className="w-full bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-accent focus:shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] pl-7 pr-3 py-2.5 rounded-lg text-sm text-text outline-none transition-all text-right font-plex"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-2 border-r border-border/50">
                                                            <div className="relative flex items-center">
                                                                <span className="absolute left-3 text-muted/50 pointer-events-none w-4 font-plex">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={row.credit}
                                                                    onChange={e => updateRow(idx, 'credit', e.target.value)}
                                                                    placeholder=""
                                                                    className="w-full bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-accent focus:shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] pl-7 pr-3 py-2.5 rounded-lg text-sm text-text outline-none transition-all text-right font-plex"
                                                                />
                                                            </div>
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
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[11px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1.5 block tracking-wider font-bold">Account</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                list="accountsList"
                                                                value={row.account}
                                                                onChange={e => updateRow(idx, 'account', e.target.value)}
                                                                placeholder="Select account..."
                                                                className="w-full bg-bg border border-border focus:border-accent focus:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] px-4 py-3.5 rounded-xl text-[15px] text-text outline-none transition-all shadow-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row gap-3">
                                                        <div className="flex-1">
                                                            <label className="text-[11px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1.5 block tracking-wider font-bold">Debit</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-plex">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={row.debit}
                                                                    onChange={e => updateRow(idx, 'debit', e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-bg border border-border focus:border-accent focus:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] pl-8 pr-4 py-3.5 rounded-xl text-[15px] text-text outline-none transition-all font-plex shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[11px] uppercase font-plex p-0.5 text-muted ml-0.5 mb-1.5 block tracking-wider font-bold">Credit</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-plex">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={row.credit}
                                                                    onChange={e => updateRow(idx, 'credit', e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-bg border border-border focus:border-accent focus:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] pl-8 pr-4 py-3.5 rounded-xl text-[15px] text-text outline-none transition-all font-plex shadow-sm"
                                                                />
                                                            </div>
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
                            <div className={`rounded-2xl border p-4 md:p-5 transition-all duration-300 ${isListening ? 'border-red-500/60 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : parsingVoice ? 'border-accent/60 bg-accent/5 shadow-[0_0_30px_rgba(var(--accent-rgb),0.08)]' : 'border-border bg-surface'}`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 sm:gap-0">
                                    <div>
                                        <h4 className="font-plex font-bold text-text text-sm flex items-center gap-2">
                                            <Mic size={16} className={isListening ? 'text-red-500' : 'text-accent'} />
                                            Voice Entry
                                            <span className="text-[10px] font-plex text-muted bg-surface2 border border-border px-2 py-0.5 rounded-full">Groq Whisper</span>
                                        </h4>
                                        <p className="font-plex text-xs text-muted mt-0.5">
                                            Record your voice — Groq AI will transcribe &amp; fill the table
                                        </p>
                                    </div>
                                    <button
                                        onClick={startVoiceEntry}
                                        disabled={parsingVoice}
                                        className={`w-full sm:w-auto relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-plex font-bold text-sm transition-all shadow-md ${isListening
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
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute inline-flex h-20 w-20 rounded-full bg-red-500/20 animate-ping"></span>
                                            <span className="relative flex h-16 w-16 rounded-full bg-red-500/10 border-2 border-red-500/50 items-center justify-center">
                                                <Mic size={28} className="text-red-500 animate-pulse" />
                                            </span>
                                        </div>
                                        <p className="font-plex text-sm text-red-500 font-bold animate-pulse">🎙 Recording... Speak your journal entry</p>
                                        <p className="font-plex text-xs text-muted">Click <strong>Stop Recording</strong> when done (auto-stops at 15s)</p>
                                    </div>
                                )}

                                {/* Transcript */}
                                {voiceTranscript && !isListening && (
                                    <div className="mt-3 bg-bg border border-border rounded-xl p-4">
                                        <p className="text-[10px] font-plex text-muted uppercase tracking-widest mb-2 font-bold flex items-center gap-1">
                                            <CheckCircle size={11} className="text-accent" /> Groq Whisper Transcript:
                                        </p>
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
                                    className={`w-full font-bold py-4 md:py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl tracking-wide ${evaluating ? 'bg-accent/40 cursor-not-allowed animate-pulse text-[#0f0e0d]' : 'bg-gradient-to-r from-accent to-accent-light text-[#0f0e0d] hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(var(--accent-rgb),0.4)]'}`}
                                >
                                    {evaluating ? <><Loader2 size={24} className="animate-spin" /> <span className="hidden sm:inline">AI is Checking your Entry...</span><span className="sm:hidden">Checking...</span></> : <><CheckCircle size={24} /> Submit Journal Entry</>}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* AI Feedback Form */}
                {feedback && (
                    <div className="bg-surface/90 backdrop-blur-xl border border-border/80 rounded-3xl md:rounded-[2rem] p-5 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-700 mt-8 md:mt-12">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-6 md:mb-8">
                            <div className={`p-4 rounded-2xl flex items-center justify-center shrink-0 ${feedback.isCorrect ? 'bg-green-500/10 text-green-500 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]'}`}>
                                {feedback.isCorrect ? <CheckCircle size={32} className="md:w-10 md:h-10" /> : <RefreshCcw size={32} className="md:w-10 md:h-10" />}
                            </div>
                            <div>
                                <h3 className={`font-playfair text-2xl md:text-3xl font-black ${feedback.isCorrect ? 'text-green-500 text-shadow-sm' : 'text-red-500 text-shadow-sm'}`}>
                                    {feedback.isCorrect ? 'Excellent!' : 'Let\'s Learn Together'}
                                </h3>
                                <p className="font-plex text-xs md:text-sm text-muted/80 mt-1 uppercase tracking-widest font-bold">AI Detailed Feedback</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-bg to-surface font-serif border border-border/50 p-5 md:p-8 rounded-2xl text-text leading-relaxed md:leading-loose text-base md:text-lg mb-8 md:mb-10 shadow-inner">
                            {feedback.feedback}
                        </div>

                        <div className="bg-bg border border-border rounded-xl mb-6 overflow-hidden shadow-sm">
                            <div className="bg-surface py-3 px-5 border-b border-border">
                                <h4 className="font-plex text-xs uppercase tracking-widest text-accent font-bold">Standard Correct Entry</h4>
                            </div>
                            <div className="p-5 space-y-3 font-plex text-[14px]">
                                {feedback.correctDr && feedback.correctDr.map((dr, i) => (
                                    <div key={'dr' + i} className="flex justify-between items-center border-b border-border/30 pb-3">
                                        <span className="flex items-center gap-3"><span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-xs">Dr.</span><span className="font-medium">{dr.account}</span></span>
                                        <span className="font-bold">${(dr.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                                {feedback.correctCr && feedback.correctCr.map((cr, i) => (
                                    <div key={'cr' + i} className="flex justify-between items-center border-b border-border/30 pb-3 pl-8">
                                        <span className="flex items-center gap-3"><span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded text-xs">Cr.</span><span className="font-medium text-muted">{cr.account}</span></span>
                                        <span className="font-bold text-muted">${(cr.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={generateTopic}
                            className="bg-accent text-[#0f0e0d] font-bold py-4 px-6 rounded-xl transition-all flex justify-center items-center gap-2 w-full shadow-[0_10px_30px_rgba(var(--accent-rgb),0.2)] hover:scale-[1.02]"
                        >
                            🚀 Next USA Bookkeeping Trick -{">"}
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
                                const val = e.target.value.trim();
                                setGroqApiKey(val);
                                localStorage.setItem('groqApiKey', val);
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
