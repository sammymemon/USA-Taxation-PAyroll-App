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
    const [playingMsg, setPlayingMsg] = useState(false);
    const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem('voiceSpeed')) || 1);
    const [questionsToAsk, setQuestionsToAsk] = useState([]);
    const [interviewActive, setInterviewActive] = useState(false);

    const recognitionRef = useRef(null);

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

    // Speech Recognition setup (Voice to Text)
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let currentTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const stopAudio = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setPlayingMsg(false);
        }
    };

    const playAudio = (text, onEndCallback) => {
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

    const startRecording = () => {
        if (recognitionRef.current) {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        } else {
            alert("Speech recognition is not supported in this browser. Try Google Chrome.");
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Regex & Logic based answer evaluation
    const evaluateAnswer = (userAns, actualAns) => {
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

    const submitAnswer = () => {
        stopRecording();
        const q = questionsToAsk[currentIndex];
        const result = evaluateAnswer(transcript, q.a);
        setFeedback(result);
        
        // Announce the percentage automatically
        let msg = `Your answer is ${result.percentage}% correct. `;
        if (result.percentage > 75) msg += "Excellent job!";
        else if (result.percentage > 50) msg += "Good attempt, but you missed some keywords.";
        else msg += "You should review this topic. Try again later.";
        
        playAudio(msg, () => {});
    };

    const nextQuestion = () => {
        stopAudio();
        setTranscript('');
        setFeedback(null);
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
        setInterviewActive(true);
        if (questionsToAsk.length > 0) {
            const q = questionsToAsk[0];
            playAudio("Let's start the interview. Question 1: " + q.q);
        }
    };

    if (loading) return <div className="text-center p-20 text-muted">Loading Interview...</div>;

    const currentQ = questionsToAsk[currentIndex];

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
                        </div>

                        {/* User Answer Area */}
                        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-playfair text-lg text-accent border-b border-border pb-1">Your Voice Answer:</h4>
                                {!feedback && (
                                    <button 
                                        onClick={isListening ? stopRecording : startRecording}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-surface2 border border-border hover:border-accent text-accent'}`}
                                    >
                                        {isListening ? <><MicOff size={18} /> Stop Listening</> : <><Mic size={18} /> Tap & Speak</>}
                                    </button>
                                )}
                            </div>

                            <div className="min-h-[140px] bg-bg border border-border rounded-xl p-5 text-text/90 leading-relaxed text-lg font-serif">
                                {transcript || <span className="text-muted italic text-base">Allow microphone permissions, tap the button and say your answer...</span>}
                            </div>

                            {!feedback && transcript && !isListening && (
                                <button 
                                    onClick={submitAnswer}
                                    className="w-full mt-6 bg-accent text-[#0f0e0d] font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform text-lg"
                                >
                                    Check My Answer (%)
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
                                            <div className="text-sm font-plex text-muted uppercase tracking-widest">Based on Keyword Regex</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-surface2 p-5 rounded-xl border border-border mb-6">
                                        <h5 className="font-plex text-xs uppercase text-accent mb-3 font-semibold">Ideal Answer & Keywords:</h5>
                                        <div className="text-[15px] leading-relaxed text-text/80 mb-4" dangerouslySetInnerHTML={{__html: currentQ?.a}}></div>
                                        <div className="flex gap-4 items-center">
                                            <button 
                                                onClick={() => playAudio("The correct answer is: " + currentQ?.a)}
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
            
            <div className="max-w-3xl mx-auto p-4 md:p-6 mb-10">
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
