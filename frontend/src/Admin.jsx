import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Trash2, PlusCircle, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function Admin() {
    const [data, setData] = useState({ categories: [], questions: [] });
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState(null);

    // AI Generation state
    const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [generatingAI, setGeneratingAI] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ id: '', q: '', a: '', cat: '', diff: '', highlight: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);

        // Fetch local static data first for instant load
        fetch('/data.json')
            .then(res => res.json())
            .then(fetchedData => {
                setData(prev => prev.questions && prev.questions.length > 0 ? prev : fetchedData);
                // Set default form category to first category if not set
                if (fetchedData.categories && fetchedData.categories.length > 0) {
                    setFormData(prev => ({ ...prev, cat: fetchedData.categories[0].id }));
                }
                setLoading(false);
            })
            .catch(console.error);

        axios.get('/api/data')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch data from backend", err);
                setLoading(false);
            });
    };

    const handleEdit = (q) => {
        setEditingCard(q.id);
        setFormData({ ...q });
    };

    const handleAdd = () => {
        const newId = data.questions.length > 0 ? Math.max(...data.questions.map(q => q.id)) + 1 : 1;
        setEditingCard('new');
        setFormData({ id: newId, q: '', a: '', cat: data.categories[0]?.id || '', diff: 'basic', highlight: '' });
    };

    const saveQuestion = async () => {
        try {
            if (editingCard !== 'new' && data.questions.find(q => q.id === formData.id) && editingCard !== formData.id) {
                alert("Question ID already exists."); return;
            }

            if (editingCard !== 'new') {
                // Update
                await axios.put(`/api/questions/${formData.id}`, formData);
            } else {
                // Add
                await axios.post('/api/questions', formData);
            }
            setEditingCard(null);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        }
    };

    const deleteQuestion = async (id) => {
        if (confirm("Are you sure you want to delete this question?")) {
            try {
                await axios.delete(`/api/questions/${id}`);
                fetchData();
            } catch (e) {
                console.error(e);
                alert("Failed to delete.");
            }
        }
    };

    const generateWithAI = async () => {
        if (!groqApiKey) {
            alert("Please set your Groq API key in the Voice Interview mode first!");
            return;
        }

        const categoryId = formData.cat || data.categories[0]?.id;
        const categoryName = data.categories.find(c => String(c.id) === String(categoryId))?.name || "Accounting";

        const existingQuestions = data.questions
            .filter(q => String(q.cat) === String(categoryId))
            .map(q => q.q);

        setGeneratingAI(true);
        try {
            const prompt = `Task: Generate a new, unique interview question and answer for the category: "${categoryName}".
The difficulty should be one of: basic, intermediate, advanced.
Ensure the answer is professional and accurate.

IMPORTANT: Do NOT generate any variations of the following already existing questions:
${JSON.stringify(existingQuestions)}

Output ONLY a raw JSON format exactly like this (no markdown, no backticks, no other text):
{"q": "Generated question text here?", "a": "The detailed answer text here (can include basic HTML like <strong> or <ul>)", "diff": "intermediate", "highlight": "A short 1-sentence summary or key point of the answer"}
`;

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 350,
                    temperature: 0.7
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            let generatedText = response.data?.choices?.[0]?.message?.content || "";
            if (generatedText.includes('```json')) {
                generatedText = generatedText.split('```json')[1].split('```')[0].trim();
            } else if (generatedText.includes('```')) {
                generatedText = generatedText.split('```')[1].split('```')[0].trim();
            }

            const resultData = JSON.parse(generatedText);
            
            setFormData(prev => ({
                ...prev,
                q: resultData.q || prev.q,
                a: resultData.a || prev.a,
                diff: resultData.diff?.toLowerCase() || prev.diff,
                highlight: resultData.highlight || prev.highlight
            }));
        } catch (error) {
            console.error("AI Generation failed:", error);
            alert("Failed to generate question with AI. Check console for details.");
        }
        setGeneratingAI(false);
    };

    const renderForm = () => (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-plex text-muted uppercase">Question Details</span>
                <button 
                    onClick={generateWithAI} 
                    disabled={generatingAI}
                    type="button"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-plex text-[11px] font-bold ${generatingAI ? 'bg-accent/50 cursor-not-allowed animate-pulse' : 'bg-surface2 border border-accent text-accent hover:bg-accent hover:text-[#0f0e0d] transition-colors'}`}
                >
                    🤖 {generatingAI ? "Generating..." : "Auto-Generate with AI"}
                </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div>
                    <label className="block font-plex text-[10px] text-muted uppercase mb-1">Category</label>
                    <select value={formData.cat} onChange={e => setFormData({ ...formData, cat: Number(e.target.value) })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text">
                        {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-plex text-[10px] text-muted uppercase mb-1">Difficulty</label>
                    <select value={formData.diff} onChange={e => setFormData({ ...formData, diff: e.target.value })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text">
                        <option value="basic">Basic</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
                <div>
                    <label className="block font-plex text-[10px] text-muted uppercase mb-1">ID</label>
                    <input type="number" value={formData.id} disabled className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-muted opacity-50" />
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block font-plex text-[10px] text-muted uppercase mb-1">Question</label>
                    <textarea value={formData.q} onChange={e => setFormData({ ...formData, q: e.target.value })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text" rows="2" />
                </div>
            </div>
            <div>
                <label className="block font-plex text-[10px] text-muted uppercase mb-1">Answer (HTML)</label>
                <textarea value={formData.a} onChange={e => setFormData({ ...formData, a: e.target.value })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text font-mono text-xs" rows="4" />
            </div>
            <div>
                <label className="block font-plex text-[10px] text-muted uppercase mb-1">Highlight Note (optional)</label>
                <input type="text" value={formData.highlight || ''} onChange={e => setFormData({ ...formData, highlight: e.target.value })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text" />
            </div>
            <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setEditingCard(null)} className="px-4 py-2 font-plex text-xs text-muted hover:text-text transition-colors">Cancel</button>
                <button onClick={saveQuestion} className="flex items-center gap-2 bg-accent text-[#0f0e0d] px-4 py-2 rounded-md font-plex font-bold text-xs hover:bg-[#c2a233] transition-colors"><Save size={16} /> Save</button>
            </div>
        </div>
    );

    if (loading) return <div className="text-center p-20 text-muted">Loading Admin Data...</div>;

    return (
        <div className="min-h-screen bg-bg text-text font-serif max-w-[1200px] mx-auto p-5 md:p-10">
            <div className="flex justify-between items-center mb-8 border-b border-border pb-5">
                <div>
                    <h1 className="font-playfair text-3xl font-black text-accent tracking-tight">Admin Dashboard</h1>
                    <div className="font-plex text-[11px] text-muted mt-2 tracking-widest uppercase">Manage Content</div>
                </div>
                <div className="flex gap-4">
                    <Link to="/" className="flex items-center gap-2 bg-surface2 px-4 py-2 rounded-md font-plex text-xs text-text hover:bg-border transition-colors">
                        <ArrowLeft size={16} /> Back to App
                    </Link>
                    <button onClick={handleAdd} className="flex items-center gap-2 bg-accent text-[#0f0e0d] px-4 py-2 rounded-md font-plex font-bold text-xs hover:bg-[#c2a233] transition-colors">
                        <PlusCircle size={16} /> Add Question
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {editingCard === 'new' && (
                    <div className="bg-surface border border-accent p-5 rounded-lg mb-4">
                        <h2 className="text-xl font-serif font-bold text-accent mb-4 border-b border-border pb-2">Add New Question</h2>
                        {renderForm()}
                    </div>
                )}
                {data.questions.slice().reverse().map(q => (
                    <div key={q.id} className="bg-surface border border-border p-5 rounded-lg">
                        {editingCard === q.id ? (
                            renderForm()
                        ) : (
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-plex text-[10px] text-accent mb-2">ID: {q.id} | <span className="uppercase">{q.cat}</span> | <span className="uppercase">{q.diff}</span></div>
                                    <h3 className="text-text font-serif font-bold text-sm mb-2">{q.q}</h3>
                                    <div className="text-muted text-xs line-clamp-2" dangerouslySetInnerHTML={{ __html: q.a }}></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(q)} className="p-2 bg-surface2 rounded-md text-text hover:bg-border transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteQuestion(q.id)} className="p-2 bg-surface2 rounded-md text-accent4 hover:bg-[#ff3b30]/20 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Admin;
