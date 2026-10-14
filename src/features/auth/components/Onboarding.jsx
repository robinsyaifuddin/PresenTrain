import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Download } from 'lucide-react';
import PWAInstallModal, { triggerDirectPWAInstall } from '@/components/ui/PWAInstallModal';

export default function Onboarding({ onFinish, siteSettings }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showPWAModal, setShowPWAModal] = useState(false);

  const slides = [
    {
      id: "presensi",
      menuLabel: "Presensi Digital",
      accentTag: "Disiplin Forum & Materi",
      title: "Presensi Cerdas LK HMI",
      desc: "Digitalisasi absensi forum LK I, LK II, LK III, dan SC dengan barcode/QR Code unik. Verifikasi instan dengan proteksi anti-titip absen serta rekapitulasi kehadiran per materi secara real-time.",
      ctaText: "Fitur Penilaian",
      bgImage: "/slide/BALIHO BTR FIX.jpg"
    },
    {
      id: "penilaian",
      menuLabel: "Penilaian & Quiz",
      accentTag: "Objektivitas MOT & SC",
      title: "Penilaian & Ujian Kader",
      desc: "Evaluasi komprehensif Master of Training (MOT) mencakup aspek afektif, kognitif, dan psikomotorik, terintegrasi dengan modul Pre-test, Post-test, dan Quiz materi perkaderan.",
      ctaText: "Tentang PresenTrain",
      bgImage: "/slide/BALIHO BTR FIX (1).jpg"
    },
    {
      id: "tentang",
      menuLabel: "Tentang PresenTrain",
      accentTag: "Perkaderan Terintegrasi",
      title: "Solusi Training HMI Modern",
      desc: "PresenTrain (Presensi & Evaluasi Training) memadukan absensi materi, ujian digital, dan yudisium kelulusan untuk mencetak kader insan cita yang berkualitas dan berintegritas.",
      ctaText: "Mulai Sekarang",
      bgImage: "/slide/BALIHO BTR FIX (2).jpg"
    }
  ];

  // Auto-play slider setiap 5 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="h-screen w-full max-h-screen text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans select-none bg-slate-50">
      
      {/* ================= FULL BLEED BACKGROUND IMAGE HERO (LIGHT OVERLAY) ================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          key={slide.id}
          src={slide.bgImage || '/slide/BALIHO BTR FIX.jpg'} 
          alt={slide.title} 
          className="w-full h-full object-cover filter brightness-105 contrast-100 transition-all duration-700 ease-out animate-fadeIn opacity-40"
        />
        {/* Light Gradient Overlay for Maximum Typography Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/80 to-slate-50/40 pointer-events-none" />
        <div className="absolute inset-0 bg-emerald-100/30 mix-blend-multiply pointer-events-none" />
      </div>

      {/* Light Emerald Gradient Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20 z-0" />

      {/* ================= TOP HEADER NAVIGATION BAR ================= */}
      <header className="relative z-30 w-full px-6 sm:px-12 py-4 flex items-center justify-between border-b border-emerald-100/80 bg-white/80 backdrop-blur-md shrink-0 shadow-2xs">
        
        {/* Left Brand Badge */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md p-1.5 shrink-0">
            <img 
              src={siteSettings?.logoUrl || '/logo/logo.png'} 
              alt={siteSettings?.siteName || 'Logo'} 
              className="w-full h-full object-contain brightness-0 invert" 
            />
          </div>
        </div>

        {/* Center Navigation Menu Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs sm:text-sm font-medium">
          {slides.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentSlide(idx)}
              className={`transition-colors duration-300 pb-1 border-b-2 cursor-pointer ${
                idx === currentSlide 
                  ? 'border-emerald-600 text-emerald-950 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.menuLabel}
            </button>
          ))}
        </nav>

        {/* Right Action Buttons (Unduh & Masuk) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => triggerDirectPWAInstall(() => setShowPWAModal(true))}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
            <span>Unduh</span>
          </button>

          <button
            onClick={onFinish}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-white" />
            <span>Masuk</span>
          </button>
        </div>

      </header>

      {/* ================= MAIN HERO TYPOGRAPHY CONTENT ================= */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 py-6 sm:py-8 relative z-20 max-w-6xl mx-auto w-full my-auto">
        <div className="space-y-6 sm:space-y-8">
          
          {/* Main Title Stack */}
          <div className="space-y-2 sm:space-y-3">
            <span className="font-serif italic text-emerald-600 text-2xl sm:text-4xl md:text-5xl block font-normal drop-shadow-2xs">
              {slide.accentTag}
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-tight drop-shadow-sm">
              {slide.title}
            </h1>
          </div>

          {/* Bottom Content Row: Left Description + Right Pill CTA */}
          <div className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Left Description with Accent Line */}
            <div className="border-l-3 border-emerald-600 pl-4 max-w-lg">
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">
                {slide.desc}
              </p>
            </div>

            {/* Right Side Pill CTA Button */}
            <div className="shrink-0">
              <button
                onClick={handleNext}
                className="group flex items-center space-x-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-300 active:scale-95 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-current group-hover:translate-x-0.5 transition-transform" />
                <span>{slide.ctaText}</span>
              </button>
            </div>

          </div>

          {/* ================= NAVIGATION CONTROLS BAR ================= */}
          <div className="pt-6 sm:pt-8 border-t border-slate-200/80 flex items-center justify-between">
            
            {/* Left Slide Counter */}
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-black text-emerald-950 tracking-wider">
                0{currentSlide + 1}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ 0{slides.length}</span>
            </div>

            {/* Center Stepper Dots */}
            <div className="flex space-x-2 items-center">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentSlide ? 'w-8 bg-emerald-600 shadow-md shadow-emerald-600/30' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Right Navigation Arrows */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className={`w-9 h-9 rounded-full border border-slate-300 bg-white flex items-center justify-center transition-all ${
                  currentSlide === 0 
                    ? 'opacity-30 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-slate-100 text-slate-800 active:scale-90 cursor-pointer shadow-2xs'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full border border-emerald-600 bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        siteSettings={siteSettings}
      />

    </div>
  );
}
