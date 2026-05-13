"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function AccessDenied({ 
  title = "Authentication Required", 
  message = "Please login or sign up to access this section of GATER." 
}) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative mb-8 group">
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-[#45f0f4]/20 blur-[60px] rounded-full group-hover:bg-[#45f0f4]/30 transition-all duration-500" />
        
        {/* The main visual - using the generated asset */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 transition-transform duration-500 hover:scale-105">
          <Image 
            src="/unauthorized_access.png" 
            alt="Access Denied" 
            fill 
            className="object-contain drop-shadow-[0_0_30px_rgba(69,240,244,0.3)]"
            priority
          />
        </div>
      </div>

      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            href="/auth/login" 
            className="cyber-btn-cyan w-full sm:w-auto px-10 py-4 text-sm font-bold uppercase tracking-widest"
          >
            Login
          </Link>
          <Link 
            href="/auth/signup" 
            className="cyber-btn-ghost w-full sm:w-auto px-10 py-4 text-sm font-bold uppercase tracking-widest border-white/10"
          >
            Sign Up
          </Link>
        </div>

        <div className="pt-8">
          <Link 
            href="/" 
            className="text-sm text-[#8b919f] hover:text-[#45f0f4] transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Decorative tech elements */}
      <div className="absolute top-1/4 left-10 w-32 h-px bg-gradient-to-r from-transparent via-[#45f0f4]/20 to-transparent rotate-45 hidden lg:block" />
      <div className="absolute bottom-1/4 right-10 w-32 h-px bg-gradient-to-r from-transparent via-[#abc7ff]/20 to-transparent -rotate-45 hidden lg:block" />
    </div>
  );
}
