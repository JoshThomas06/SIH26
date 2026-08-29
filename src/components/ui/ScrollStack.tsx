"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";

interface ScrollStackProps {
 children: ReactNode;
}

export default function ScrollStack({ children }: ScrollStackProps) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [stackProgress, setStackProgress] = useState(0);
 const [wipeProgress, setWipeProgress] = useState(0);
 const [maxRadius, setMaxRadius] = useState(2000);

 // Convert children to array to map over them
 const childrenArray = React.Children.toArray(children);
 const numItems = childrenArray.length;

 useEffect(() => {
 const updateMaxRadius = () => {
 const w = window.innerWidth;
 const h = window.innerHeight;
 setMaxRadius(Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2)) + 100);
 };
 updateMaxRadius();
 window.addEventListener('resize', updateMaxRadius);
 let animationFrameId: number;

 const render = () => {
 if (containerRef.current) {
 const rect = containerRef.current.getBoundingClientRect();
 // The container is several vh tall. 
 // We want progress 0 when it starts entering (or hits top), 
 // and 1 when it's about to leave the top.
 // Let's make progress start when the sticky container hits the top (rect.top <= 0)

 const scrollableDistance = rect.height - window.innerHeight;
 const scrolled = -rect.top;

 const currentProgress = Math.max(0, Math.min(1, scrolled / scrollableDistance));

 // stackProgress runs from 0 to (numItems-1)/numItems
 const ratio = (numItems - 1) / numItems;
 setStackProgress(Math.min(1, currentProgress / ratio));

 // wipeProgress runs from ratio to 1
 setWipeProgress(Math.max(0, (currentProgress - ratio) / (1 - ratio)));
 }
 animationFrameId = requestAnimationFrame(render);
 };

 animationFrameId = requestAnimationFrame(render);
 return () => {
 cancelAnimationFrame(animationFrameId);
 window.removeEventListener('resize', updateMaxRadius);
 };
 }, [numItems]);

 const innerRadius = wipeProgress * maxRadius;

 return (
 // Give it a large height: numItems * 100vh for stacking + 100vh for wipe
 <div ref={containerRef} className="relative w-full z-20 pointer-events-none" style={{ height: `${(numItems + 1) * 100}vh` }}>
 {/* Sticky container that holds the actual UI on screen */}
 <div
 className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden bg-[#FFE600] px-4 md:px-8 py-12 md:py-16 pointer-events-auto"
 style={{
 maskImage: `radial-gradient(circle at center, transparent ${innerRadius}px, black ${innerRadius}px)`,
 WebkitMaskImage: `radial-gradient(circle at center, transparent ${innerRadius}px, black ${innerRadius}px)`,
 visibility: wipeProgress === 1 ? 'hidden' : 'visible'
 }}
 >
 <div className="relative w-[95vw] max-w-[1600px] aspect-[16/9] mx-auto perspective-[1200px]">
 {childrenArray.map((child, index) => {
 // Each card gets a "slice" of the total progress.
 // Let's map stackProgress (0 to 1) to an active index (0 to numItems - 1)
 const globalProgress = stackProgress * (numItems - 1); // 0 to 4

 // How far is this specific card from being the "active" top card?
 // If relativeProgress < 0, it means this card is in the PAST (underneath newer cards).
 // If relativeProgress > 0, it means this card is in the FUTURE (coming up from below).
 const relativeProgress = index - globalProgress;

 // --- CALCULATE STYLES BASED ON PROGRESS ---

 // Y Translation:
 // If it's in the future (relativeProgress > 0), it should be pushed down.
 // If it's the active one or in the past (relativeProgress <= 0), translateY is 0.
 const translateY = relativeProgress > 0
 ? `${Math.min(1, relativeProgress) * 100}%`
 : "0%";

 // Scale:
 // If it's in the past (relativeProgress < 0), we scale it down slightly to create depth.
 // Max scale down is maybe 0.9.
 const scale = relativeProgress < 0
 ? Math.max(0.9, 1 + (relativeProgress * 0.05))
 : 1;

 // Opacity (darkening effect):
 // If it's in the past, it gets darker. 1 means fully visible, 0 means black.
 // We use a pseudo-element for darkening, or opacity. 
 // Using opacity on a wrapper might reveal the background. So we use scale + opacity.
 const opacity = relativeProgress < 0
 ? Math.max(0, 1 + (relativeProgress * 0.3)) // fades out as it goes deeper
 : 1;

 // Z-index: later cards should be on top
 const zIndex = index;

 return (
 <div
 key={index}
 className="absolute inset-0 w-full h-full flex items-center justify-center rounded-[2rem] overflow-hidden shadow-2xl transition-transform duration-0 will-change-transform bg-[#111]"
 style={{
 transform: `translateY(${translateY}) scale(${scale})`,
 opacity: opacity,
 zIndex: zIndex,
 transformOrigin: 'top center',
 }}
 >
 {child}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}

export function ScrollStackItem({ children }: { children: ReactNode }) {
 // Simple wrapper, though the actual image will likely just be passed directly.
 return (
 <div className="w-full h-full bg-[#111] border border-white/5 overflow-hidden flex items-center justify-center">
 {children}
 </div>
 );
}
