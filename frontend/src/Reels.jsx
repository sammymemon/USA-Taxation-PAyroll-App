import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, ChevronUp, ChevronDown } from 'lucide-react';

const REELS = [
    'Y0W3fsuyuqM', 'iEhhB30Dwcg', 'OYbA90nf4ZE', 'PNe1BW75C9k', 
    'Qm-78U3yEn0', 'MafYa5E0-dg', 'Nl41Zb5X6DQ', 'np2SxxYJsdk', 
    'x6WW3RA0C0s', 'JWPXtBIWe8U', '9qbOFsgql_A', 'WerJYgHhRX0', 
    'ChpQnQEHNvM'
];

export default function Reels() {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);

    const handleScroll = (e) => {
        const height = e.target.clientHeight;
        const scrollAmount = e.target.scrollTop;
        const index = Math.round(scrollAmount / height);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    const scrollToIndex = (index) => {
        if (containerRef.current && index >= 0 && index < REELS.length) {
            containerRef.current.scrollTo({
                top: index * containerRef.current.clientHeight,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col font-inter overflow-hidden w-full max-w-full">
            {/* Nav Header */}
            <div className="absolute top-0 w-full z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                <Link to="/" className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto">
                    <ArrowLeft size={20}/>
                </Link>
                <div className="font-bold text-shadow flex items-center gap-2 drop-shadow-md tracking-wide">
                    <Video size={18} className="text-accent" fill="currentColor"/> Bookkeeping Shorts
                </div>
                <div className="w-10"></div>
            </div>

            {/* Scroll Container */}
            <div 
                ref={containerRef}
                className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar"
                onScroll={handleScroll}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {REELS.map((id, idx) => (
                    <div key={id} className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-zinc-950">
                        {/* We load the iframe for adjacent items to prevent white flashes, but autoplay only the active one */}
                        {Math.abs(activeIndex - idx) <= 2 ? (
                            <div className="w-full h-full relative sm:max-w-md m-auto">
                                <iframe 
                                    className="w-full h-full border-none shadow-2xl"
                                    src={`https://www.youtube.com/embed/${id}?autoplay=${activeIndex === idx ? 1 : 0}&loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1&playsinline=1`} 
                                    title="YouTube Short" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center sm:max-w-md text-zinc-600 font-bold tracking-widest uppercase text-xs">
                                Loading...
                            </div>
                        )}
                        
                        {/* Status Overlay */}
                        <div className="absolute bottom-6 left-4 z-40 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl text-xs font-bold font-plex shadow-lg pointer-events-none border border-white/10">
                            Reel {idx + 1} of {REELS.length}
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Navigation Controls (Alternative to swipe for reliable access) */}
            <div className="absolute right-4 bottom-1/2 translate-y-1/2 flex flex-col gap-4 z-50 pointer-events-auto">
                <button 
                    onClick={() => scrollToIndex(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white disabled:opacity-30 transition-all hover:bg-black/80 hover:scale-110"
                >
                    <ChevronUp size={24}/>
                </button>
                <button 
                    onClick={() => scrollToIndex(activeIndex + 1)}
                    disabled={activeIndex === REELS.length - 1}
                    className="p-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white disabled:opacity-30 transition-all hover:bg-black/80 hover:scale-110"
                >
                    <ChevronDown size={24}/>
                </button>
            </div>
        </div>
    );
}
