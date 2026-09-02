"use client";

import { useEffect, useRef, useState } from "react";
import { withBase } from "../lib/utils";

export default function ScrollAnimation() {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const circleRef = useRef<HTMLDivElement>(null);
 const [imagesLoaded, setImagesLoaded] = useState(0);
 const totalFrames = 192; // Extracted from video

 // Use a ref to store images so they aren't part of React state updates
 const imagesRef = useRef<HTMLImageElement[]>([]);
 
 useEffect(() => {
 // Preload images
 const images: HTMLImageElement[] = [];
 let loadedCount = 0;
 
 for (let i = 1; i <= totalFrames; i++) {
 const img = new Image();
 // Format: frame_001.webp to frame_192.webp
 const paddedIndex = i.toString().padStart(3, '0');
 
 const handleLoad = () => {
 loadedCount++;
 if (loadedCount % 10 === 0 || loadedCount === totalFrames) {
 setImagesLoaded(loadedCount);
 }
 };
 
 img.onload = handleLoad;
 img.onerror = handleLoad;
 
 img.src = withBase(`/assets/dragon-radar-frames/frame_${paddedIndex}.webp`);
 
 images.push(img);
 }
 
 imagesRef.current = images;
 }, []);

 useEffect(() => {
 const canvas = canvasRef.current;
 const container = containerRef.current;
 if (!canvas || !container) return;
 
 const context = canvas.getContext("2d");
 if (!context) return;
 
 // Set fixed canvas size matching video dimensions for best quality
 canvas.width = 1920;
 canvas.height = 1080;
 
 let animationFrameId: number;
 let currentFrame = -1;
 
 const render = () => {
 // Calculate scroll progress within the container
 const rect = container.getBoundingClientRect();
 
 // Calculate progress 0 to 1
 // When rect.top is 0, progress is 0. 
 // When rect.bottom is window.innerHeight, progress is 1.
 const scrollableDistance = rect.height - window.innerHeight;
 const scrolled = -rect.top;
 const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
 
 // Phase 1: 0 to 0.75 (Frames 0 to 190)
 const videoProgress = Math.min(1, progress / 0.75);
 const frameIndex = Math.min(190, Math.floor(videoProgress * 190));
 
 // Phase 2: 0.75 to 1.0 (Yellow circle expands)
 const circleProgress = Math.max(0, (progress - 0.75) / 0.25);
 
 if (frameIndex !== currentFrame && imagesRef.current[frameIndex]?.complete) {
 currentFrame = frameIndex;
 
 // Clear and draw the image
 context.clearRect(0, 0, canvas.width, canvas.height);
 
 // We can draw it to cover or contain, but since canvas is 1920x1080 and 
 // the CSS handles scaling, we just draw it at natural resolution.
 context.drawImage(imagesRef.current[frameIndex], 0, 0, 1920, 1080);
 }

 // Update yellow circle overlay
 if (circleRef.current) {
 circleRef.current.style.clipPath = `circle(${circleProgress * 150}vw at center)`;
 circleRef.current.style.visibility = circleProgress > 0 ? 'visible' : 'hidden';
 }
 
 animationFrameId = requestAnimationFrame(render);
 };
 
 // Start render loop
 animationFrameId = requestAnimationFrame(render);
 
 return () => {
 cancelAnimationFrame(animationFrameId);
 };
 }, []);

 return (
 <section ref={containerRef} className="relative h-[500vh] w-full bg-black">
 <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
 {imagesLoaded < totalFrames * 0.1 && (
 <div className="absolute z-10 text-[var(--primary)] opacity-50 font-mono text-xs text-center p-4">
 Loading animation... {Math.floor((imagesLoaded / totalFrames) * 100)}%
 </div>
 )}
 <canvas 
 ref={canvasRef} 
 className="w-full h-full object-cover max-w-full" 
 />
 {/* Expanding Yellow Circle triggered after frame 190 */}
 <div 
 ref={circleRef}
 className="absolute inset-0 w-full h-full bg-[#FFE600] will-change-transform"
 style={{
 visibility: 'hidden'
 }}
 />
 </div>
 </section>
 );
}
