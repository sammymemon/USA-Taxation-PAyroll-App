import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Trash2, PlusCircle, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function Admin() {
    const [data, setData] = useState({ categories: [], questions: [] });
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState(null);

    // Form states
    const [formData, setFormData] = useState({ id: '', q: '', a: '', cat: '', diff: '', highlight: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);

        // Fetch local static data first for instant load
        axios.get('/data.json')
            .then(res => {
                setData(prev => prev.questions && prev.questions.length > 0 ? prev : res.data);
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
        setEditingCard(newId);
        setFormData({ id: newId, q: '', a: '', cat: data.categories[0]?.id || '', diff: 'basic', highlight: '' });
    };

    const saveQuestion = async () => {
        try {
            if (data.questions.find(q => q.id === formData.id) && editingCard !== formData.id) {
                alert("Question ID already exists."); return;
            }

            if (data.questions.find(q => q.id === formData.id) && data.questions.find(q => q.id === editingCard)) {
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
                {data.questions.slice().reverse().map(q => (
                    <div key={q.id} className="bg-surface border border-border p-5 rounded-lg">
                        {editingCard === q.id ? (
                            <div className="flex flex-col gap-4">
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block font-plex text-[10px] text-muted uppercase mb-1">ID</label>
                                        <input type="number" value={formData.id} disabled className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-muted opacity-50" />
                                    </div>
                                    <div>
                                        <label className="block font-plex text-[10px] text-muted uppercase mb-1">Category</label>
                                        <select value={formData.cat} onChange={e => setFormData({ ...formData, cat: e.target.value })} className="w-full bg-surface2 border border-border rounded-md p-2 text-sm text-text">
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
