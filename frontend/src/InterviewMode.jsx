import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Bot, CheckCircle, Loader2, Play, Settings, Sparkles, AlertCircle, RefreshCcw, ShieldCheck, Mic, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

// Utility to convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([out], { type: "audio/wav" });
}

const DEFAULT_TOPICS = [
    "Accounting Equation", "Debit/Credit Rules", "Normal Account Balances", "T-Accounts", "Cash vs Accrual Basis", "Chart of Accounts",
    "Revenue Recognition (ASC 606)", "Sales Returns & Allowances", "Credit Memos", "Allowance for Doubtful Accounts", "Bad Debt Write-offs", "Unearned Revenue",
    "Purchase Orders (PO) vs Bill", "1099 Vendor Setup", "Early Payment Discounts", "Prepaid Expenses",
    "Bank Reconciliation", "Outstanding Checks", "Deposits in Transit", "NSF Checks", "Petty Cash Fund", "Credit Card Reconciliation",
    "Hourly vs Salary & Overtime", "Employer Payroll Taxes (FICA)", "Employee Payroll Deductions", "Form 941 & 940", "W-2 vs 1099 Classification",
    "Depreciation (MACRS)", "Accrued Revenue", "Accrued Expenses", "Retained Earnings", "Cost of Goods Sold (COGS)"
];

async function callGroq(apiKey, messages, maxTokens = 1500, json = false) {
    try {
        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
        };
        if (json) payload.response_format = { type: 'json_object' };

        const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            payload,
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        return res.data?.choices?.[0]?.message?.content || '';
    } catch (e) {
        console.error('Groq API error:', e?.response?.data || e.message);
        throw e;
    }
}

export default function InterviewMode() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || localStorage.getItem('grokApiKey') || '');
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('hinglish');
    const [status, setStatus] = useState('idle'); // idle, generating, verifying, done, error
    const [lessonData, setLessonData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Podcast states
    const [podcastScript, setPodcastScript] = useState(null);
    const [podcastStatus, setPodcastStatus] = useState('idle');
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [podcastError, setPodcastError] = useState('');
    const [mergedAudioUrl, setMergedAudioUrl] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleLearn = async (selectedTopic) => {
        const activeTopic = selectedTopic || topic;
        if (!activeTopic.trim()) return alert("Please enter a topic to learn!");
        if (!apiKey) return alert("Please enter your Groq API Key first!");

        setStatus('podcast_mode');
        setTopic(activeTopic);
        setPodcastStatus('generating_script');
        setPodcastError('');
        setPodcastScript(null);
        setMergedAudioUrl(null);

        try {
            const podcastPrompt = `You are a master USA Bookkeeping & Accounting tutor creating an educational podcast.
Topic: "${activeTopic}"
Language: ${language === 'hinglish' ? 'Hinglish (Hindi words written in English alphabet mixed with accounting terms, e.g. "Yaar, jab hum cash receive karte hain, toh Cash account ko debit karte hain")' : 'Clear professional English'}.

Create a 2-person podcast script between Teacher and Student.
RULES:
1. Teacher MUST explain the concept first in 1-2 lines.
2. Student asks a clarifying question.
3. Teacher MUST give a specific real example with journal entry, saying exactly: which account is DEBITED (with amount) and which is CREDITED (with amount). E.g. "Cash account ko 5000 dollar se debit karo, aur Sales Revenue ko 5000 dollar se credit karo."
4. Student confirms understanding.
5. Total 6-8 lines of dialogue. Accounting math MUST be 100% correct - debits must equal credits.

Output ONLY a JSON array:
[
  { "speaker": "Teacher", "text": "..." },
  { "speaker": "Student", "text": "..." }
]`;

            const scriptRaw = await callGroq(apiKey, [
                { role: 'system', content: 'You only output a JSON array of objects.' },
                { role: 'user', content: podcastPrompt }
            ], 2500);

            let scriptData;
            try {
                const match = scriptRaw.match(/\[[\s\S]*\]/);
                scriptData = JSON.parse(match ? match[0] : scriptRaw);
            } catch (e) {
                console.error("Parse Error Podcast Script", scriptRaw);
                throw new Error("Failed to parse podcast script.");
            }

            setPodcastScript(scriptData);
            setPodcastStatus('generating_audio');

            // StreamElements TTS - free, no API key, no CORS issues (Amazon Polly voices)
            const audioUrls = [];
            for (let i = 0; i < scriptData.length; i++) {
                const line = scriptData[i];
                // Teacher = Aditi (Indian female), Student = Raveena (Indian female)
                const voice = line.speaker.toLowerCase().includes("teacher") ? "Aditi" : "Raveena";
                const seUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(line.text)}`;
                const seResponse = await fetch(seUrl);
                if (!seResponse.ok) throw new Error(`Audio generation failed for line ${i + 1}. Check your internet.`);
                const blob = await seResponse.blob();
                audioUrls.push(URL.createObjectURL(blob));
            }

            // Attach audio URLs to script
            const scriptWithAudio = scriptData.map((line, idx) => ({ ...line, audioUrl: audioUrls[idx] }));
            setPodcastScript(scriptWithAudio);
            
            // Wait for user interaction to play to bypass autoplay restrictions
            setPodcastStatus('ready_to_play');

        } catch (err) {
            console.error(err);
            setPodcastError(err.message || "Failed to generate podcast.");
            setPodcastStatus('error');
        }
    };

    const playSequence = (script, index) => {
        if (index >= script.length) {
            setPodcastStatus('idle');
            setCurrentLineIndex(0);
            return;
        }

        setCurrentLineIndex(index);
        const audio = new Audio(script[index].audioUrl);
        audio.onended = () => {
            playSequence(script, index + 1);
        };
        audio.onerror = () => {
            console.error("Audio playback error");
            playSequence(script, index + 1);
        };
        audio.play().catch(e => {
            console.error("Play prevented", e);
            setPodcastStatus('error');
            setPodcastError("Audio playback was blocked by the browser.");
        });
    };

    const handleDownloadPodcast = async () => {
        if (!podcastScript || isDownloading) return;
        setIsDownloading(true);
        try {
            if (mergedAudioUrl) {
                // Already merged, just trigger download
                triggerDownload(mergedAudioUrl, `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_Podcast.wav`);
                setIsDownloading(false);
                return;
            }

            // Merge audios
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffers = [];
            
            for (const line of podcastScript) {
                if (!line.audioUrl) continue;
                const response = await fetch(line.audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers.push(audioBuffer);
            }
            
            const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
            const offlineContext = new OfflineAudioContext(
                audioBuffers[0].numberOfChannels,
                totalLength,
                audioBuffers[0].sampleRate
            );
            
            let offset = 0;
            for (const buffer of audioBuffers) {
                const source = offlineContext.createBufferSource();
                source.buffer = buffer;
                source.connect(offlineContext.destination);
                source.start(offset);
                offset += buffer.duration;
            }
            
            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = audioBufferToWav(renderedBuffer);
            const finalUrl = URL.createObjectURL(wavBlob);
            setMergedAudioUrl(finalUrl);
            triggerDownload(finalUrl, `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_Podcast.wav`);
        } catch (err) {
            console.error("Merge error:", err);
            alert("Failed to merge and download audio.");
        }
        setIsDownloading(false);
    };

    const triggerDownload = (url, filename) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border p-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-lg hover:bg-surface2 transition-all text-muted hover:text-accent shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl md:text-2xl font-bold text-text flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg text-accent">
                            <Bot size={20} />
                        </div>
                        AI Teacher Mode
                    </h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Form Section */}
                {status === 'idle' || status === 'error' ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <div className="bg-gradient-to-br from-surface to-bg border border-border rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center mb-8">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <BookOpen size={140} />
                            </div>
                            
                            <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center mx-auto mb-6 border border-accent/20 shadow-inner">
                                <Sparkles size={40} />
                            </div>
                            
                            <div className="flex gap-2 justify-center mb-6 relative z-10">
                                <button 
                                    onClick={() => setLanguage('english')} 
                                    className={`px-5 py-2.5 rounded-xl font-plex text-[13px] font-bold transition-all ${language === 'english' ? 'bg-accent text-[#0f0e0d] shadow-lg shadow-accent/20 scale-105' : 'bg-surface border border-border text-muted hover:border-accent hover:text-text'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => setLanguage('hinglish')} 
                                    className={`px-5 py-2.5 rounded-xl font-plex text-[13px] font-bold transition-all ${language === 'hinglish' ? 'bg-accent text-[#0f0e0d] shadow-lg shadow-accent/20 scale-105' : 'bg-surface border border-border text-muted hover:border-accent hover:text-text'}`}
                                >
                                    Hinglish
                                </button>
                            </div>
                            
                            <h2 className="text-3xl md:text-4xl font-playfair font-black mb-4">What do you want to learn?</h2>
                            <p className="text-muted font-plex text-sm max-w-xl mx-auto mb-8">
                                Enter any USA accounting topic. Aria (AI) will teach you in {language === 'english' ? 'English' : 'simple Hinglish'}, and internally double-check the journal entries for 100% accuracy.
                            </p>

                            <div className="max-w-md mx-auto space-y-4 relative z-10">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder="e.g. Accrued Revenue entries..."
                                    className="w-full bg-bg border border-border px-4 py-4 rounded-xl font-plex text-text outline-none focus:border-accent shadow-sm transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleLearn()}
                                />
                                <button
                                    onClick={() => handleLearn()}
                                    className="w-full bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-accent/20"
                                >
                                    <Play size={18} fill="currentColor"/> Generate Verified Lesson
                                </button>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-2 justify-center relative z-10 max-w-2xl mx-auto">
                                {DEFAULT_TOPICS.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setTopic(t); handleLearn(t); }}
                                        className="text-xs font-plex px-3 py-1.5 rounded-full border border-border bg-surface hover:border-accent hover:text-accent transition-colors text-muted"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl font-plex text-sm flex items-center gap-3">
                                <AlertCircle size={18} /> {errorMsg}
                            </div>
                        )}
                        
                            <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-lg mt-8 text-center max-w-sm mx-auto">
                                <h5 className="font-plex text-sm text-text font-semibold mb-3 flex items-center justify-center gap-2">
                                    🔑 API Keys Setup
                                </h5>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Groq API Key (gsk_...)"
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            localStorage.setItem('groqApiKey', e.target.value.trim());
                                        }}
                                        className="w-full bg-bg border border-border px-3 py-2 rounded-lg text-[13px] font-plex outline-none focus:border-accent text-center"
                                    />
                                </div>
                                <p className="font-plex text-[10px] text-muted mt-3">Required for AI script generation (TTS is free, no key needed)</p>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Result Section */}
                {status === 'podcast_mode' && (
                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-6 flex justify-between items-center">
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-4 py-2 bg-surface border border-border rounded-xl font-plex text-xs font-bold text-muted hover:text-accent flex items-center gap-2 transition-colors"
                            >
                                <ArrowLeft size={14} /> Learn Another Topic
                            </button>
                        </div>

                        <div className="mb-8">
                                
                                {/* Premium Podcast Feature */}
                                <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                                    {/* Decorative background elements */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-6">
                                        <div>
                                            <h3 className="font-playfair text-2xl md:text-3xl font-black text-white flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-[#e6c239] flex items-center justify-center text-[#0f0e0d] shadow-lg shrink-0">
                                                    <Mic size={20} />
                                                </div>
                                                Aria Podcast
                                            </h3>
                                            <p className="font-plex text-xs text-gray-400">AI Generated Audio Experience</p>
                                        </div>
                                        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button 
                                                    onClick={podcastStatus === 'ready_to_play' ? () => playSequence(podcastScript, 0) : null}
                                                    disabled={podcastStatus === 'generating_script' || podcastStatus === 'generating_audio' || podcastStatus === 'playing'}
                                                    className="bg-white text-black px-5 py-2.5 rounded-full font-plex text-sm font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] w-full md:w-auto"
                                                >
                                                    {(podcastStatus === 'generating_script' || podcastStatus === 'generating_audio') ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor"/>}
                                                    {podcastStatus === 'generating_script' ? 'Writing...' : podcastStatus === 'generating_audio' ? 'Generating Audio...' : podcastStatus === 'ready_to_play' ? 'Start Playing ▶' : podcastStatus === 'playing' ? 'Playing...' : 'Generate Episode'}
                                                </button>
                                                
                                                {(podcastStatus === 'ready_to_play' || podcastStatus === 'playing') && (
                                                    <button 
                                                        onClick={handleDownloadPodcast}
                                                        disabled={isDownloading}
                                                        className="bg-[#2a2a2a] text-white px-5 py-2.5 rounded-full font-plex text-sm font-bold hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg border border-[#444] w-full md:w-auto"
                                                        title="Download Full Podcast Audio"
                                                    >
                                                        {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                        {isDownloading ? 'Merging...' : 'Download'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {podcastError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-plex mb-6 animate-pulse flex items-center gap-3"><AlertCircle size={18}/> {podcastError}</div>}
                                    
                                    {podcastScript && (
                                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar mt-6 relative z-10">
                                            {podcastScript.map((line, idx) => {
                                                const isPlaying = podcastStatus === 'playing' && currentLineIndex === idx;
                                                const isTeacher = line.speaker.toLowerCase().includes('teacher');
                                                
                                                return (
                                                    <div key={idx} className={`flex ${isTeacher ? 'justify-start' : 'justify-end'} transition-all duration-500 ${isPlaying ? 'scale-[1.02]' : 'opacity-80'}`}>
                                                        <div className={`max-w-[95%] md:max-w-[85%] flex gap-3 ${isTeacher ? 'flex-row' : 'flex-row-reverse'}`}>
                                                            {/* Avatar */}
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-playfair text-lg shrink-0 shadow-lg ${isTeacher ? 'bg-gradient-to-br from-accent to-[#d4b02c] text-[#0f0e0d]' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                                                                {line.speaker.charAt(0)}
                                                            </div>
                                                            
                                                            {/* Bubble */}
                                                            <div className={`relative p-4 md:p-5 rounded-2xl ${
                                                                isTeacher 
                                                                    ? 'bg-[#1a1a1a] border border-[#333] rounded-tl-sm' 
                                                                    : 'bg-blue-600 text-white rounded-tr-sm'
                                                            } ${isPlaying && isTeacher ? 'border-accent shadow-[0_0_15px_rgba(209,178,54,0.15)]' : isPlaying && !isTeacher ? 'shadow-[0_0_15px_rgba(37,99,235,0.3)]' : ''}`}>
                                                                
                                                                <div className={`flex items-center gap-2 mb-2 ${isTeacher ? 'justify-start' : 'justify-end'}`}>
                                                                    <span className={`font-plex text-[10px] font-bold tracking-widest uppercase ${isTeacher ? 'text-accent' : 'text-blue-200'}`}>
                                                                        {line.speaker}
                                                                    </span>
                                                                    {isPlaying && (
                                                                        <span className="flex gap-[2px] items-end h-3 ml-2">
                                                                            <span className={`w-1 h-2 animate-[bounce_1s_infinite] rounded-full ${isTeacher ? 'bg-accent' : 'bg-white'}`}></span>
                                                                            <span className={`w-1 h-3 animate-[bounce_1s_infinite_0.2s] rounded-full ${isTeacher ? 'bg-accent' : 'bg-white'}`}></span>
                                                                            <span className={`w-1 h-1.5 animate-[bounce_1s_infinite_0.4s] rounded-full ${isTeacher ? 'bg-accent' : 'bg-white'}`}></span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className={`font-serif text-base md:text-lg leading-relaxed ${isTeacher ? 'text-gray-200' : 'text-white'}`}>
                                                                    {line.text}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
