


import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, Square, ChevronRight, ArrowLeft, Volume2, RefreshCcw, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

function InterviewMode() {
    const [data, setData] = useState({ categories: [], questions: [] });
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [evaluating, setEvaluating] = useState(false);
    const [hint, setHint] = useState(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [playingMsg, setPlayingMsg] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Groq Whisper AI States
    const [useGroqAI, setUseGroqAI] = useState(() => localStorage.getItem('useGroqAI') === 'true');
    const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [transcribingGroq, setTranscribingGroq] = useState(false);
    const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem('voiceSpeed')) || 1);
    const [questionsToAsk, setQuestionsToAsk] = useState([]);
    const [interviewActive, setInterviewActive] = useState(false);

    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef("");

    useEffect(() => {
        axios.get('/data.json')
            .then(res => {
                setData(res.data);
                // Shuffle questions for interview mode
                const shuffled = [...res.data.questions].sort(() => Math.random() - 0.5);
                setQuestionsToAsk(shuffled);
                setLoading(false);
            })
            .catch(() => {
                axios.get('/api/data')
                    .then(res => {
                        setData(res.data);
                        const shuffled = [...res.data.questions].sort(() => Math.random() - 0.5);
                        setQuestionsToAsk(shuffled);
                        setLoading(false);
                    });
            });
    }, []);

    // Speech Recognition setup (Voice to Text - Browser Native)
    useEffect(() => {
        if (!useGroqAI && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            // Need to set continuous=true so it doesn't stop, but interimResults=true can cause massive duplication
            // if we don't handle the "isFinal" flag correctly. Let's fix the bug making it repeat text 4 times.
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            // Use Indian English for better accent recognition
            recognitionRef.current.lang = 'en-IN';

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const latestResult = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        // Once phrase is finalised by browser, append to actual secure transcript memory
                        finalTranscriptRef.current += latestResult + ' ';
                    } else {
                        // Real-time guessing of the current phrase
                        interimTranscript += latestResult;
                    }
                }

                // Show the user the locked-in history + whatever is currently being guessed
                setTranscript(finalTranscriptRef.current + interimTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                if (event.error !== 'no-speech') {
                    setIsListening(false);
                }
            };

            recognitionRef.current.onend = () => {
                // Browser might automatically end after silence. Let user restart if they want.
                if (!useGroqAI && isListening) setIsListening(false);
            };
        }
    }, [useGroqAI]);

    const stopAudio = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setPlayingMsg(false);
        }
    };

    const playAudio = (text, onEndCallback) => {
        if (!text) text = '';
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            const plainText = text.replace(/<[^>]+>/g, ' ');
            const utterance = new SpeechSynthesisUtterance(plainText);

            const voices = window.speechSynthesis.getVoices();
            const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india'));
            if (indianVoice) utterance.voice = indianVoice;
            else utterance.lang = 'en-IN';

            utterance.rate = voiceSpeed;
            utterance.onend = () => {
                setPlayingMsg(false);
                if (onEndCallback) onEndCallback();
            };
            utterance.onerror = () => setPlayingMsg(false);

            setPlayingMsg(true);
            window.speechSynthesis.speak(utterance);
        }
    };

    const startRecording = async () => {
        setTranscript('');
        finalTranscriptRef.current = '';

        if (useGroqAI) {
            if (!groqApiKey) {
                alert("Please enter your free Groq API Key at the bottom of the page first!");
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    processGroqAudio(audioBlob);
                    // Stop all microphone tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                recorder.start();
                setMediaRecorder(recorder);
                setIsListening(true);
            } catch (error) {
                console.error("Microphone error:", error);
                alert("Please allow microphone permissions.");
            }
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
            } else {
                alert("Speech recognition is not supported in this browser. Try Google Chrome or enable Groq Whisper AI.");
            }
        }
    };

    const stopRecording = () => {
        if (useGroqAI && mediaRecorder) {
            mediaRecorder.stop();
            setIsListening(false);
        } else if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Process Groq Whisper Audio
    const processGroqAudio = async (audioBlob) => {
        setTranscribingGroq(true);
        const formData = new FormData();
        const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

        formData.append('file', file);
        formData.append('model', 'whisper-large-v3-turbo'); // Groq's super fast whisper model
        formData.append('language', 'en'); // optimize for English

        try {
            const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setTranscript(res.data.text);
        } catch (error) {
            console.error(error);
            alert("Groq AI Transcription Failed. Please check if your API Key is correct.");
        }
        setTranscribingGroq(false);
    };

    // Regex & Logic based answer evaluation
    const evaluateAnswer = (userAns, actualAns) => {
        userAns = userAns || '';
        actualAns = actualAns || '';
        // Strip HTML and special chars
        const cleanActual = actualAns.replace(/<[^>]+>/g, ' ').toLowerCase().replace(/[^\w\s]/gi, ' ');
        const cleanUser = userAns.toLowerCase().replace(/[^\w\s]/gi, ' ');

        // Basic stop words to ignore
        const stopwords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'are', 'was', 'were', 'it', 'this', 'that', 'by', 'as', 'be', 'can', 'will'];

        const getWords = (str) => str.split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));

        const actualWords = [...new Set(getWords(cleanActual))];
        const userWords = [...new Set(getWords(cleanUser))];

        if (actualWords.length === 0) return { percentage: 100, matchedWords: [] };

        let matchCount = 0;
        let matchedWords = [];

        actualWords.forEach(word => {
            // regex to find if the actual word is present in user's spoken answer
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(cleanUser) || cleanUser.includes(word)) {
                matchCount++;
                matchedWords.push(word);
            }
        });

        let percentage = Math.round((matchCount / actualWords.length) * 100);

        // Bonus points if user spoke a good length string
        if (userWords.length > actualWords.length * 0.5 && percentage < 100) {
            percentage += 15;
        }
        if (percentage > 100) percentage = 100;

        return { percentage, matchedWords, totalWords: actualWords.length };
    };

    const submitAnswer = async () => {
        stopRecording();
        const q = questionsToAsk[currentIndex] || { q: '', a: '' };

        setEvaluating(true);
        setFeedback(null);

        try {
            if (!useGroqAI || !groqApiKey) throw new Error("Groq API disabled or no key provided.");

            const prompt = `Task: Act as an accounting interview reviewer.
Compare the user's spoken answer to the actual correct answer.
Actual Answer: ${(q.a || '').replace(/<[^>]+>/g, ' ')}
User's Answer: ${transcript || ''}

Provide your evaluation feedback and also suggest a simple, easy-to-remember correct answer in BOTH English and Hinglish.

Output ONLY a raw JSON format exactly like this (no markdown, no backticks, no other text):
{"percentage": 85, "feedback": "Good attempt, but you missed X.\\n\\nSimple Answer / Suggestion (English): [Your simple English answer]\\n\\nSimple Answer / Suggestion (Hinglish): [Your simple Hinglish answer]"}
`;

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 350,
                    temperature: 0.2
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            let resultData;
            try {
                let generatedText = response.data?.choices?.[0]?.message?.content || "";

                if (generatedText.includes('```json')) {
                    generatedText = generatedText.split('```json')[1].split('```')[0].trim();
                } else if (generatedText.includes('```')) {
                    generatedText = generatedText.split('```')[1].split('```')[0].trim();
                }

                resultData = JSON.parse(generatedText);

                if (resultData.percent !== undefined && resultData.percentage === undefined) {
                    resultData.percentage = resultData.percent;
                }
            } catch (err) {
                console.log("AI Parse error or unexpected output format. Output:", response.data);
                resultData = evaluateAnswer(transcript, q.a);
                let fallbackMsg = "";
                if (resultData.percentage >= 80) fallbackMsg = "Excellent! You confidently hit all the major keywords for this topic.";
                else if (resultData.percentage >= 50) fallbackMsg = "Good effort. You got the main idea, but try to include more specific accounting terminology.";
                else fallbackMsg = "You missed some key concepts. Don't worry, review the ideal answer below and try to catch the main keywords!";
                resultData.feedback = `(Smart Regex Evaluator) ${fallbackMsg}`;
            }

            setFeedback(resultData);
            setEvaluating(false);

            const msg = `Score ${resultData.percentage}%. ${resultData.feedback || ""}`;
            playAudio(msg, () => { });

        } catch (error) {
            console.error("AI Evaluation Error", error);
            const resultData = evaluateAnswer(transcript, q.a);

            let fallbackMsg = "";
            if (resultData.percentage >= 80) fallbackMsg = "Excellent! You confidently hit all the major keywords for this topic.";
            else if (resultData.percentage >= 50) fallbackMsg = "Good effort. You got the main idea, but try to include more specific accounting terminology.";
            else fallbackMsg = "You missed some key concepts. Don't worry, review the ideal answer below and try to catch the main keywords!";

            resultData.feedback = `(Smart Regex Evaluator) ${fallbackMsg}`;
            setFeedback(resultData);
            setEvaluating(false);

            playAudio(resultData.feedback, () => { });
        }
    };

    const generateHint = async () => {
        const q = questionsToAsk[currentIndex] || { q: '', a: '' };
        setLoadingHint(true);

        try {
            if (!useGroqAI || !groqApiKey) throw new Error("Groq API disabled or no key provided.");

            const prompt = `Task: Provide a very brief 1-sentence hint or 3 keywords to help the user answer this interview question.
Question: ${q.q || ''}
Actual Answer Context: ${(q.a || '').replace(/<[^>]+>/g, ' ')}

Output ONLY the hint text. No formatting, no json.`;

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 50,
                    temperature: 0.5
                },
                {
                    headers: {
                        "Authorization": `Bearer ${groqApiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            let generatedText = response.data?.choices?.[0]?.message?.content || "";
            setHint(generatedText.trim().replace(/^['"]|['"]$/g, ''));
        } catch (error) {
            console.error(error);
            // Smart local keyword extraction for Hint
            const cleanAns = (q.a || '').replace(/<[^>]+>/g, ' ').replace(/[^\w\s]/gi, ' ');
            const words = cleanAns.split(/\s+/).filter(w => w.length > 6);
            const hints = [...new Set(words)].slice(0, 3).join(", ");
            setHint(`Try to mention these keywords: ${hints || 'core principles, rules, compliance'}`);
        }
        setLoadingHint(false);
    };

    const nextQuestion = () => {
        stopAudio();
        setTranscript('');
        finalTranscriptRef.current = '';
        setFeedback(null);
        setHint(null);
        if (currentIndex < questionsToAsk.length - 1) {
            setCurrentIndex(prev => prev + 1);
            // Automatically read next question
            setTimeout(() => {
                const q = questionsToAsk[currentIndex + 1];
                playAudio("Question: " + q.q);
            }, 500);
        }
    };

    const startInterview = () => {
        let filteredQuestions = data.questions;
        if (selectedCategory !== 'All') {
            filteredQuestions = data.questions.filter(q => q.cat === parseInt(selectedCategory, 10));
        }

        if (filteredQuestions.length === 0) {
            alert('No questions found for this category');
            return;
        }

        const shuffled = [...filteredQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        setQuestionsToAsk(shuffled);
        setCurrentIndex(0);
        setInterviewActive(true);

        if (shuffled.length > 0) {
            const q = shuffled[0] || { q: '', a: '' };
            playAudio("Let's start the interview. Question 1: " + (q.q || ''));
        }
    };

    if (loading) return <div className="text-center p-20 text-muted">Loading Interview...</div>;

    const currentQ = questionsToAsk[currentIndex] || { q: '', a: '' };

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border p-4 md:p-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link to="/" onClick={stopAudio} className="p-2 bg-bg border border-border rounded-lg hover:bg-surface2 hover:border-accent/50 transition-all text-muted hover:text-accent shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-lg md:text-2xl font-bold text-text flex items-center gap-2">
                        <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                            <Mic size={18} />
                        </div>
                        <span className="hidden sm:inline">Voice Interview Mode</span>
                        <span className="inline sm:hidden">Interview</span>
                    </h1>
                </div>
                {interviewActive && (
                    <span className="font-plex text-xs text-muted bg-surface2 border border-border px-3 py-1.5 rounded-full">
                        Q {currentIndex + 1}/{questionsToAsk.length}
                    </span>
                )}
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 md:p-10">
                {!interviewActive ? (
                    <div className="bg-surface border border-border rounded-2xl p-6 md:p-10 shadow-xl text-center">
                        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
                            <Mic size={30} className="text-accent" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text mb-3">Ready for Your Interview?</h2>
                        <p className="text-muted mb-8 max-w-md mx-auto leading-relaxed font-plex text-sm">
                            The app will speak a question aloud. Answer using your voice — AI will evaluate your response and score it based on keyword match.
                        </p>

                        <div className="mb-8 max-w-xs mx-auto text-left">
                            <label className="block text-xs font-plex text-accent mb-2 uppercase tracking-widest font-bold">
                                Select Category
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-bg border border-border px-4 py-3 rounded-xl text-text font-plex text-sm focus:border-accent outline-none appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="All">All Categories ({data.questions?.length || 0})</option>
                                {data.categories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name} ({cat.count || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={startInterview}
                            className="bg-accent text-[#0f0e0d] font-bold px-10 py-4 rounded-xl text-base hover:scale-105 transition-transform flex items-center gap-2 mx-auto shadow-lg shadow-accent/20"
                        >
                            <Play size={20} fill="currentColor" /> Start Voice Interview
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {/* Progress Bar */}
                        <div className="w-full bg-surface border border-border rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-accent h-full rounded-full transition-all duration-500"
                                style={{ width: `${((currentIndex + 1) / questionsToAsk.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <div className="bg-surface border border-border rounded-2xl p-5 md:p-8 shadow-lg relative">
                            {playingMsg && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-accent font-plex font-bold animate-pulse border border-accent/30 bg-accent/10 px-2.5 py-1 rounded-full">
                                    <Volume2 size={11} /> Speaking...
                                </div>
                            )}
                            <p className="font-plex text-[10px] text-muted uppercase tracking-widest mb-3 font-bold">Question {currentIndex + 1}</p>
                            <h3 className="font-serif text-lg md:text-2xl text-text leading-relaxed">
                                {currentQ?.q}
                            </h3>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    onClick={() => playAudio(currentQ?.q)}
                                    className="flex items-center gap-1.5 text-xs font-plex px-3 py-2 bg-surface2 border border-border rounded-lg text-accent hover:bg-accent hover:text-[#0f0e0d] transition-all"
                                >
                                    <RefreshCcw size={13} /> Repeat
                                </button>
                                {playingMsg && (
                                    <button
                                        onClick={stopAudio}
                                        className="flex items-center gap-1.5 text-xs font-plex px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Square size={13} fill="currentColor" /> Stop
                                    </button>
                                )}
                            </div>

                            {!feedback && (
                                <div className="mt-4 border-t border-border pt-4">
                                    {!hint ? (
                                        <button
                                            onClick={generateHint}
                                            disabled={loadingHint}
                                            className="text-xs font-plex text-accent hover:underline flex items-center gap-1.5 opacity-80 hover:opacity-100"
                                        >
                                            {loadingHint ? "🤖 Generating hint..." : "💡 Get AI Hint (Groq)"}
                                        </button>
                                    ) : (
                                        <div className="bg-accent/5 border border-accent/20 p-3 rounded-xl text-sm text-text/90 italic animate-fadeIn">
                                            💡 <span className="text-accent font-semibold not-italic">Hint: </span>{hint}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Answer Area */}
                        <div className="bg-surface border border-border rounded-2xl p-5 md:p-8 shadow-lg">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                <div>
                                    <h4 className="font-playfair text-base md:text-lg text-text font-bold">Your Answer</h4>
                                    {useGroqAI && (
                                        <span className="bg-accent/10 text-accent border border-accent/20 text-[10px] font-plex px-2 py-0.5 rounded-md uppercase font-bold tracking-wider mt-1 inline-block">
                                            Groq Whisper Active
                                        </span>
                                    )}
                                </div>
                                {!feedback && (
                                    <button
                                        onClick={isListening ? stopRecording : startRecording}
                                        disabled={transcribingGroq}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold font-plex text-sm transition-all w-full sm:w-auto justify-center ${
                                            isListening
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                                : 'bg-accent text-[#0f0e0d] shadow-lg shadow-accent/20'
                                        } ${transcribingGroq ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                    >
                                        {isListening ? <><MicOff size={17} /> Stop</> : <><Mic size={17} /> Tap &amp; Speak</>}
                                    </button>
                                )}
                            </div>

                            <div className="min-h-[110px] md:min-h-[140px] bg-bg border border-border rounded-xl p-4 md:p-5 text-text/90 leading-relaxed text-base md:text-lg font-serif">
                                {transcribingGroq ? (
                                    <span className="text-accent animate-pulse flex items-center gap-2 text-sm">
                                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                        Groq AI transcribing...
                                    </span>
                                ) : transcript ? transcript : (
                                    <span className="text-muted/70 italic text-sm">Tap the button above and speak your answer...</span>
                                )}
                            </div>

                            {!feedback && transcript && !isListening && (
                                <button
                                    onClick={submitAnswer}
                                    disabled={evaluating}
                                    className={`w-full mt-4 text-[#0f0e0d] font-bold py-4 rounded-xl transition-all font-plex flex justify-center items-center gap-2 ${
                                        evaluating ? 'bg-accent/50 cursor-not-allowed animate-pulse' : 'bg-accent hover:scale-[1.01] shadow-lg shadow-accent/20'
                                    }`}
                                >
                                    {evaluating ? "🤖 Evaluating..." : "✓ Check My Answer"}
                                </button>
                            )}

                            {/* Feedback */}
                            {feedback && (
                                <div className="mt-6 pt-6 border-t border-border animate-fadeIn space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`text-4xl md:text-5xl font-black ${
                                            feedback.percentage >= 70 ? 'text-green-500' :
                                            feedback.percentage >= 40 ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                            {feedback.percentage}%
                                        </div>
                                        <div>
                                            <div className="font-playfair text-lg font-bold text-text">Match Score</div>
                                            <div className="text-[10px] font-plex text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full border border-border mt-1 inline-block">
                                                {feedback.feedback?.includes("Regex") ? "Regex Evaluator" : "🤖 AI Evaluator"}
                                            </div>
                                        </div>
                                    </div>

                                    {feedback.feedback && (
                                        <div className="bg-surface2/50 p-4 rounded-xl border border-border">
                                            <h5 className="font-plex text-[10px] uppercase text-accent mb-2 font-bold tracking-widest">AI Feedback</h5>
                                            <div className="text-sm leading-relaxed text-text/90 whitespace-pre-wrap">{feedback.feedback}</div>
                                        </div>
                                    )}

                                    <div className="bg-surface2/50 p-4 rounded-xl border border-border">
                                        <h5 className="font-plex text-[10px] uppercase text-accent mb-3 font-bold tracking-widest">Ideal Answer &amp; Keywords</h5>
                                        <div className="text-sm leading-relaxed text-text/80 mb-3" dangerouslySetInnerHTML={{ __html: currentQ?.a || "" }}></div>
                                        <button
                                            onClick={() => playAudio("The correct answer is: " + (currentQ?.a || ''))}
                                            className="text-accent text-xs flex items-center gap-1 hover:underline font-plex"
                                        >
                                            <Volume2 size={13} /> Listen to answer
                                        </button>
                                    </div>

                                    <button
                                        onClick={nextQuestion}
                                        className="w-full bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl font-plex flex justify-center items-center gap-2 hover:scale-[1.01] shadow-lg shadow-accent/20 transition-all"
                                    >
                                        Next Question <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 md:p-10 mb-10">
                {/* Transcription Engine Settings */}
                <div className="bg-surface border border-accent/20 rounded-2xl p-5 md:p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                            <h4 className="font-playfair text-lg md:text-xl text-accent font-bold flex items-center gap-2">
                                🎙️ Transcription Engine
                            </h4>
                            <p className="text-xs md:text-sm text-muted leading-relaxed font-plex mt-2">
                                Switch between browser built-in or <b>Groq Whisper Large V3 Turbo</b> — unlimited, lightning-fast, and free.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center bg-surface2 rounded-xl p-1 border border-border self-start">
                            <button
                                onClick={() => { setUseGroqAI(false); localStorage.setItem('useGroqAI', 'false'); }}
                                className={`px-3 py-2 font-plex text-xs font-semibold rounded-lg transition-all ${
                                    !useGroqAI ? 'bg-bg border border-border text-text shadow-sm' : 'text-muted hover:text-text'
                                }`}
                            >
                                Built-in
                            </button>
                            <button
                                onClick={() => { setUseGroqAI(true); localStorage.setItem('useGroqAI', 'true'); }}
                                className={`px-3 py-2 font-plex text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                                    useGroqAI ? 'bg-accent text-[#0f0e0d] shadow-sm' : 'text-muted hover:text-accent'
                                }`}
                            >
                                ✨ Groq AI
                            </button>
                        </div>
                    </div>

                    {useGroqAI && (
                        <div className="animate-fadeIn bg-surface2/50 border border-border p-4 rounded-xl">
                            <h5 className="font-plex text-xs text-text font-bold mb-3">🔑 Enter your free Groq API Key:</h5>
                            <ol className="text-xs font-plex text-muted mb-4 pl-4 space-y-1 list-decimal">
                                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">console.groq.com/keys</a> and log in free.</li>
                                <li>Create API Key (starts with <code className="text-[10px] bg-bg px-1 py-0.5 rounded border border-border text-text">gsk_...</code>).</li>
                                <li>Paste it below — stored locally, never sent to our servers.</li>
                            </ol>
                            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                                <input
                                    type="password"
                                    placeholder="gsk_xxxxxxxx..."
                                    value={groqApiKey}
                                    onChange={(e) => {
                                        setGroqApiKey(e.target.value);
                                        localStorage.setItem('groqApiKey', e.target.value);
                                    }}
                                    className="flex-1 bg-bg border border-border px-3 py-2.5 rounded-lg text-xs font-plex outline-none focus:border-accent"
                                />
                                {groqApiKey && <div className="text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-2 flex items-center justify-center rounded-lg text-xs font-plex font-bold">✔ Ready</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default InterviewMode;
