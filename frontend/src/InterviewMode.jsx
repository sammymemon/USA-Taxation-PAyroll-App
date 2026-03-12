


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

Output ONLY a raw JSON format exactly like this (no markdown, no backticks, no other text):
{"percentage": 85, "feedback": "Good attempt, but you missed X."}
`;

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 150,
                    temperature: 0.1
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

        const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
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
            <div className="bg-surface border-b border-border p-6 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" onClick={stopAudio} className="p-2 border border-border rounded-md hover:bg-surface2 transition-colors text-muted hover:text-accent">
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className="font-playfair text-xl md:text-2xl font-bold text-accent">
                        🎤 Voice Interview Mode
                    </h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 md:p-10">
                {!interviewActive ? (
                    <div className="bg-surface border border-border rounded-xl p-8 text-center shadow-lg">
                        <h2 className="text-2xl font-playfair font-bold text-accent mb-4">Ready for your Interview?</h2>
                        <p className="text-muted mb-8 max-w-lg mx-auto leading-relaxed">
                            In this mode, the app will speak a question.
                            You will answer using your voice directly without typing.
                            We will use Regex filtering to evaluate your speech and score your answer based on keywords match.
                        </p>

                        <div className="mb-8 max-w-xs mx-auto text-left">
                            <label className="block text-sm font-plex text-accent mb-2 uppercase tracking-wide">
                                Select Category
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-bg border border-border px-4 py-3 rounded-lg text-text font-serif focus:border-accent outline-none appearance-none cursor-pointer"
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
                            className="bg-accent text-[#0f0e0d] font-bold px-8 py-4 rounded-xl text-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                        >
                            <Play size={20} fill="currentColor" /> Start Voice Interview
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center font-plex text-xs text-muted uppercase tracking-widest">
                            <span>Question {currentIndex + 1} of {questionsToAsk.length}</span>
                        </div>

                        {/* Question Card */}
                        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-lg relative">
                            {playingMsg && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-accent font-plex font-bold animate-pulse border border-accent/30 bg-accent/10 px-3 py-1 rounded-full">
                                    <Volume2 size={14} /> Speaking...
                                </div>
                            )}

                            <h3 className="font-serif text-xl md:text-2xl text-text leading-relaxed mt-4">
                                {currentQ?.q}
                            </h3>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => playAudio(currentQ?.q)}
                                    className="p-3 bg-surface2 border border-border rounded-full text-accent hover:bg-accent hover:text-[#0f0e0d] transition-all"
                                    title="Repeat Question"
                                >
                                    <RefreshCcw size={18} />
                                </button>
                                {playingMsg && (
                                    <button
                                        onClick={stopAudio}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        title="Stop Audio"
                                    >
                                        <Square size={18} fill="currentColor" />
                                    </button>
                                )}
                            </div>

                            {!feedback && (
                                <div className="mt-6 border-t border-border pt-4 text-center">
                                    {!hint ? (
                                        <button
                                            onClick={generateHint}
                                            disabled={loadingHint}
                                            className="text-sm font-plex text-accent hover:underline flex items-center gap-1.5 mx-auto opacity-80 hover:opacity-100"
                                        >
                                            {loadingHint ? "🤖 Thinking..." : "💡 Generate AI Idea / Hint (Groq AI)"}
                                        </button>
                                    ) : (
                                        <div className="bg-surface2/50 border border-border p-4 rounded-lg text-sm text-text/90 italic animate-fadeIn">
                                            💡 <span className="text-accent font-semibold flex-1">Idea:</span> {hint}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* User Answer Area */}
                        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-playfair text-lg text-accent border-b border-border pb-1 flex items-center gap-2">
                                    Your Voice Answer:
                                    {useGroqAI && <span className="bg-accent text-[#0f0e0d] text-[10px] font-plex px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Groq Whisper AI Active</span>}
                                </h4>
                                {!feedback && (
                                    <button
                                        onClick={isListening ? stopRecording : startRecording}
                                        disabled={transcribingGroq}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-surface2 border border-border hover:border-accent text-accent'} ${transcribingGroq ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isListening ? <><MicOff size={18} /> Stop Listening</> : <><Mic size={18} /> Tap & Speak</>}
                                    </button>
                                )}
                            </div>

                            <div className="min-h-[140px] bg-bg border border-border rounded-xl p-5 text-text/90 leading-relaxed text-lg font-serif">
                                {transcribingGroq ? (
                                    <span className="text-accent animate-pulse flex items-center gap-2"><div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div> 🤖 Groq AI is transcribing perfectly...</span>
                                ) : transcript ? (
                                    transcript
                                ) : (
                                    <span className="text-muted italic text-base">Allow microphone permissions, tap the button and say your answer...</span>
                                )}
                            </div>

                            {!feedback && transcript && !isListening && (
                                <button
                                    onClick={submitAnswer}
                                    disabled={evaluating}
                                    className={`w-full mt-6 text-[#0f0e0d] font-bold py-4 rounded-xl transition-all text-lg flex justify-center items-center gap-2 ${evaluating ? 'bg-accent/50 cursor-not-allowed animate-pulse' : 'bg-accent hover:scale-[1.02]'}`}
                                >
                                    {evaluating ? "🤖 AI Evaluating Answer..." : "Check My Answer (%)"}
                                </button>
                            )}

                            {/* Feedback Section */}
                            {feedback && (
                                <div className="mt-8 pt-6 border-t border-border animate-fadeIn">
                                    <div className="flex items-center gap-5 mb-6">
                                        <div className={`text-5xl font-black ${feedback.percentage >= 70 ? 'text-green-500' : feedback.percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {feedback.percentage}%
                                        </div>
                                        <div>
                                            <div className="font-playfair text-xl font-bold text-text mb-1">Match Score</div>
                                            <div className="text-sm font-plex text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full border border-border mt-1 inline-block">
                                                {feedback.feedback && feedback.feedback.includes("Fallback") ? "Regex Keyword Evaluator" : "🤖 AI Ringg-Squirrel Evaluator"}
                                            </div>
                                        </div>
                                    </div>

                                    {feedback.feedback && (
                                        <div className="bg-surface2 p-5 rounded-xl border border-border mb-6">
                                            <h5 className="font-plex text-xs uppercase text-accent mb-2 font-semibold">AI Feedback:</h5>
                                            <p className="text-[15px] leading-relaxed text-text/90">{feedback.feedback}</p>
                                        </div>
                                    )}

                                    <div className="bg-surface2 p-5 rounded-xl border border-border mb-6">
                                        <h5 className="font-plex text-xs uppercase text-accent mb-3 font-semibold">Ideal Answer & Keywords:</h5>
                                        <div className="text-[15px] leading-relaxed text-text/80 mb-4" dangerouslySetInnerHTML={{ __html: currentQ?.a || "" }}></div>
                                        <div className="flex gap-4 items-center">
                                            <button
                                                onClick={() => playAudio("The correct answer is: " + (currentQ?.a || ''))}
                                                className="text-accent text-sm flex items-center gap-1 hover:underline font-plex"
                                            >
                                                <Volume2 size={16} /> Listen to ideal answer
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={nextQuestion}
                                        className="w-full bg-surface2 border border-border hover:border-accent text-accent font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 text-lg hover:bg-surface2/50"
                                    >
                                        Next Question <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto p-4 md:p-6 mb-10 space-y-6">

                {/* Free Transcription Engine Toggle (Solution to User Request) */}
                <div className="bg-surface border border-accent/30 rounded-xl p-5 md:p-6 shadow-lg shadow-accent/5">
                    <div className="flex justify-between items-start gap-4 mb-4 flex-col md:flex-row">
                        <div>
                            <h4 className="font-playfair text-xl text-accent font-bold flex items-center gap-2">🎙️ Pro Transcription Engine (Groq Whisper)</h4>
                            <p className="text-[14px] text-muted leading-relaxed font-serif mt-2">
                                Having issues with the browser's built-in transcription duplicating words? Switch to the world's fastest, 100% Free AI Transcription Engine powered by <b>Groq (Whisper Large V3 Turbo)</b>! It's unlimited and lightning-fast.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center bg-surface2 rounded-lg p-1 border border-border mt-2 md:mt-0">
                            <button
                                onClick={() => { setUseGroqAI(false); localStorage.setItem('useGroqAI', 'false'); }}
                                className={`px-4 py-2 font-plex text-[12px] font-semibold rounded-md transition-colors ${!useGroqAI ? 'bg-bg border border-border text-text shadow-sm' : 'text-muted hover:text-text'}`}
                            >
                                Built-in (Fixed)
                            </button>
                            <button
                                onClick={() => { setUseGroqAI(true); localStorage.setItem('useGroqAI', 'true'); }}
                                className={`px-4 py-2 font-plex text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1 ${useGroqAI ? 'bg-accent text-[#0f0e0d] shadow-sm shadow-accent/20' : 'text-muted hover:text-accent'}`}
                            >
                                ✨ Groq AI (Best)
                            </button>
                        </div>
                    </div>

                    {useGroqAI && (
                        <div className="animate-fadeIn mt-6 bg-surface2/50 border border-border p-4 rounded-lg">
                            <h5 className="font-plex text-sm text-text font-semibold mb-2">Setup 100% Free Unlimited Groq AI:</h5>
                            <ol className="text-[13px] font-serif text-muted/90 mb-4 pl-4 space-y-1 list-decimal">
                                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">console.groq.com/keys</a> and log in for free.</li>
                                <li>Click "Create API Key" and copy the key (Starts with <code className="text-[11px] bg-bg px-1 py-0.5 rounded border border-border text-text">gsk_...</code>).</li>
                                <li>Paste it here! It runs purely in your browser so it's totally safe, free, and insanely fast.</li>
                            </ol>
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
                                {groqApiKey && <div className="text-green-500 bg-green-500/10 border border-green-500/20 px-3 flex items-center rounded-lg text-xs font-plex relative group cursor-default">✔️ Ready<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max bg-surface border border-border p-2 rounded text-[10px] text-muted">Key stored locally only.</div></div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-surface2/30 border border-border rounded-xl p-5 md:p-6">
                    <h4 className="font-playfair text-xl text-accent mb-3 font-bold flex items-center gap-2">🤖 How to add Free AI for Smart Evaluation?</h4>
                    <p className="text-[15px] text-muted leading-relaxed font-serif">
                        Currently, we use Regex string matching to calculate the %. To make it 100% smart like ChatGPT, you can plug in a free AI model:
                    </p>
                    <ul className="text-sm text-text mt-4 space-y-3 font-plex bg-surface p-4 rounded-lg border border-border">
                        <li><b>1. Get Free API Key:</b> Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-accent underline">Google AI Studio (Gemini 1.5 Flash is FREE)</a> or Groq.</li>
                        <li><b>2. Create Backend Route:</b> In your `server.js`, add an endpoint `POST /api/evaluate`.</li>
                        <li><b>3. Send Data:</b> Send `currentQuestion.a` (actual answer) and the `transcript` (user's spoken answer) to your endpoint.</li>
                        <li><b>4. AI Prompt:</b> Tell AI: <i>"Compare the user's answer to the actual answer. Output only a JSON with exactly &#123; percent: number, feedback: string &#125;"</i>.</li>
                        <li><b>5. Implement:</b> Replace the `evaluateAnswer` function in this component with an `axios.post('/api/evaluate')` call.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default InterviewMode;
