"use client";
import { useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="sticky top-0 w-full z-0" data-cid="hero-video-container">
      {/* Container with sharp corners */}
      <div className="relative w-full h-[65vh] md:h-[85vh] overflow-hidden bg-black group">
        {/* Video Element */}
        <video 
          ref={videoRef}
          autoPlay
          muted
          src="/videos/final-home.mp4" 
          className="w-full h-full object-cover"
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.warn("Hero video error", e);
            e.stopPropagation();
          }}
        />
        
        {/* Initial Play Button Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-500 z-20">
            <button 
              onClick={togglePlay}
              className="w-20 h-20 md:w-24 md:h-24 bg-[#111]/90 rounded-full flex items-center justify-center hover:bg-primary hover:text-black hover:scale-105 transition-all duration-300 border border-primary text-white shadow-2xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="ml-2">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </button>
          </div>
        )}

        {/* Global Surveillance Overlay Text */}
        <div className="absolute top-0 bottom-0 left-0 w-full md:w-[70%] bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
        
        <div className="absolute bottom-8 left-6 md:bottom-16 md:left-16 pointer-events-none z-10 drop-shadow-2xl">
          <h1 className="text-4xl md:text-[5rem] lg:text-[7rem] font-bold tracking-tighter text-white font-['Google_Sans',sans-serif] leading-[0.9] mb-4 md:mb-6" style={{ letterSpacing: '-0.05em' }}>
            GLOBAL<br/>SURVEILLANCE
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-white text-xs md:text-sm font-mono tracking-widest uppercase font-bold bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 w-max shadow-xl">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              India = ES origin
            </span>
            <span className="hidden md:inline opacity-50">|</span>
            <span className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Red = illustrative threat corridors
            </span>
          </div>
          
          <div className="mt-6 pointer-events-auto">
            <a href="https://sih.innosolve.in/" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#00ff00] text-black px-8 py-3 rounded-full hover:bg-white transition-colors uppercase font-bold tracking-widest text-xs md:text-sm shadow-[0_0_20px_rgba(0,255,0,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]">
              Initialize Prototype →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
