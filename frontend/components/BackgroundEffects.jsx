'use client';
import { useEffect, useRef } from 'react';

const AMOUNT = 20;
const SINE_DOTS = Math.floor(AMOUNT * 0.3);
const WIDTH = 26;
const IDLE_TIMEOUT = 150;

export default function BackgroundEffects() {
  const cursorRef = useRef(null);
  const dotsRef = useRef([]);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';

    let animationFrameId;
    let lastFrame = performance.now();
    let mousePosition = { x: -100, y: -100 }; // Start offscreen
    let timeoutID;
    let idle = false;
    
    // Initialize dots state
    const dotsState = Array.from({ length: AMOUNT }, (_, index) => {
      const scale = 1 - 0.05 * index;
      return {
        index,
        anglespeed: 0.05,
        x: mousePosition.x,
        y: mousePosition.y,
        scale,
        range: WIDTH / 2 - (WIDTH / 2) * scale + 2,
        limit: WIDTH * 0.75 * scale,
        lockX: 0,
        lockY: 0,
        angleX: 0,
        angleY: 0,
      };
    });

    const goInactive = () => {
      idle = true;
      for (let dot of dotsState) {
        dot.lockX = dot.x;
        dot.lockY = dot.y;
        dot.angleX = Math.PI * 2 * Math.random();
        dot.angleY = Math.PI * 2 * Math.random();
      }
    };

    const startIdleTimer = () => {
      timeoutID = setTimeout(goInactive, IDLE_TIMEOUT);
      idle = false;
    };

    const resetIdleTimer = () => {
      clearTimeout(timeoutID);
      startIdleTimer();
    };

    const handleMouseMove = (e) => {
      mousePosition.x = e.clientX;
      mousePosition.y = e.clientY;
      resetIdleTimer();
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mousePosition.x = e.touches[0].clientX;
        mousePosition.y = e.touches[0].clientY;
        resetIdleTimer();
      }
    };

    const positionCursor = (delta) => {
      let x = mousePosition.x;
      let y = mousePosition.y;
      
      dotsState.forEach((dot, index) => {
        let nextDot = dotsState[index + 1] || dotsState[0];
        dot.x = x;
        dot.y = y;
        
        // Draw logic
        const el = dotsRef.current[index];
        if (el) {
          if (!idle || dot.index <= SINE_DOTS) {
            el.style.transform = `translate(calc(-50% + ${dot.x}px), calc(-50% + ${dot.y}px)) scale(${dot.scale})`;
          } else {
            dot.angleX += dot.anglespeed;
            dot.angleY += dot.anglespeed;
            dot.y = dot.lockY + Math.sin(dot.angleY) * dot.range;
            dot.x = dot.lockX + Math.sin(dot.angleX) * dot.range;
            el.style.transform = `translate(calc(-50% + ${dot.x}px), calc(-50% + ${dot.y}px)) scale(${dot.scale})`;
          }
        }

        if (!idle || index <= SINE_DOTS) {
          const dx = (nextDot.x - dot.x) * 0.35;
          const dy = (nextDot.y - dot.y) * 0.35;
          x += dx;
          y += dy;
        }
      });
    };

    const render = (timestamp) => {
      const delta = timestamp - lastFrame;
      positionCursor(delta);
      lastFrame = timestamp;
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    animationFrameId = requestAnimationFrame(render);
    startIdleTimer();

    return () => {
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutID);
    };
  }, []);

  return (
    <>
      {/* ── Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, backgroundColor: 'var(--bg)' }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ffffff 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div 
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #f8fafc 0%, transparent 100%)' }}
        />
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #e2e8f0 0%, transparent 100%)' }}
        />
      </div>

      {/* ── Invisible SVG for Gooey Filter ── */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" 
              result="goo" 
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ── Interactive Cursor Layer ── */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 w-full h-full z-[9999]"
        style={{
          mixBlendMode: 'difference',
          filter: 'url(#goo)'
        }}
      >
        {Array.from({ length: AMOUNT }).map((_, i) => (
          <span
            key={i}
            ref={(el) => (dotsRef.current[i] = el)}
            className="absolute block rounded-full bg-white origin-center"
            style={{
              width: `${WIDTH}px`,
              height: `${WIDTH}px`,
              transform: `translate(calc(-50% - 100px), calc(-50% - 100px)) scale(${1 - 0.05 * i})`,
            }}
          />
        ))}
      </div>
    </>
  );
}
