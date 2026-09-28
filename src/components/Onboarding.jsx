import React, { useState } from 'react';
import { 
  ArrowUpRight, QrCode, Sparkles, ShieldCheck, CheckCircle2, 
  ChevronLeft, ChevronRight, HelpCircle, Info, BookOpen
} from 'lucide-react';

export default function Onboarding({ onFinish, siteSettings }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: "scanner",
      menuLabel: "Fitur Scanner",
      accentTag: "verifikasi instant",
      title: "Scanner Anti-Ganda",
      desc: "Verifikasi kehadiran peserta secara instan melalui HP panitia dengan proteksi anti-duplicate presensi otomatis per sesi.",
      ctaText: "Lihat Panduan",
      bgImage: "/scanner_hero.jpg"
    },
    {
      id: "panduan",
      menuLabel: "Panduan",
      accentTag: "kemudahan akses",
      title: "3 Langkah Presensi",
      desc: "1. Peserta login & simpan Kartu QR. 2. Panitia pindai QR saat sesi materi. 3. Super Admin ekspor laporan Excel otomatis.",
      ctaText: "Tentang Kami",
      bgImage: "/profile_hero.jpg"
    },
    {
      id: "tentang",
      menuLabel: "Tentang Kami",
      accentTag: "solusi terpercaya",
      title: "Manajemen Training",
      desc: "PresenTrain didesain khusus untuk mendukung kegiatan pelatihan, seminar, dan workshop hingga 500+ peserta aktif secara cepat.",
      ctaText: "Mulai Sekarang",
      bgImage: "/management_hero.jpg"
    }
  ];

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
    <div className="h-screen w-full max-h-screen text-white flex flex-col justify-between relative overflow-hidden font-sans select-none bg-slate-950">
      
      {/* ================= FULL BLEED BACKGROUND IMAGE HERO ================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          key={slide.id}
          src={slide.bgImage || '/training_hero.jpg'} 
          alt={slide.title} 
          className="w-full h-full object-cover scale-105 filter brightness-90 contrast-105 transition-all duration-700 ease-out animate-fadeIn"
        />
        {/* Dark Gradient Overlay for Maximum Typography Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40 pointer-events-none" />
        <div className="absolute inset-0 bg-emerald-950/20 mix-blend-overlay pointer-events-none" />
      </div>

      {/* ================= TOP HEADER NAVIGATION BAR ================= */}
      <header className="relative z-30 w-full px-6 sm:px-12 py-5 flex items-center justify-between border-b border-white/10 bg-slate-950/30 backdrop-blur-md shrink-0">
        
        {/* Left Brand Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md p-1 shrink-0">
            <img 
              src={siteSettings?.logoUrl || '/logo/logo.png'} 
              alt={siteSettings?.siteName || 'Logo'} 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="hidden sm:inline-block font-extrabold text-lg sm:text-xl tracking-tight text-white lowercase">
            {siteSettings?.siteName?.toLowerCase() || 'presentrain'}
          </span>
        </div>

        {/* Center Navigation Menu Links */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs sm:text-sm font-medium">
          {slides.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentSlide(idx)}
              className={`transition-colors duration-300 pb-1 border-b-2 ${
                idx === currentSlide 
                  ? 'border-emerald-400 text-white font-bold' 
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              {item.menuLabel}
            </button>
          ))}
        </nav>

        {/* Right Action Button (Masuk ke App ↗) */}
        <button
          onClick={onFinish}
          className="group flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-full font-bold text-xs shadow-lg transition-all duration-300 active:scale-95"
        >
          <span>Masuk ke App</span>
          <ArrowUpRight className="w-4 h-4 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

      </header>

      {/* ================= MAIN HERO TYPOGRAPHY CONTENT ================= */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 py-6 sm:py-8 relative z-20 max-w-6xl mx-auto w-full my-auto">
        <div className="space-y-6 sm:space-y-8">
          
          {/* Main Title Stack */}
          <div className="space-y-1">
            <span className="font-serif italic text-emerald-400 text-3xl sm:text-5xl md:text-6xl block -mb-2 sm:-mb-4 capitalize font-normal drop-shadow-md">
              {slide.accentTag}
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
              {slide.title}
            </h1>
          </div>

          {/* Bottom Content Row: Left Description + Right Pill CTA */}
          <div className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Left Description with Accent Line */}
            <div className="border-l-2 border-emerald-400 pl-4 max-w-md">
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-normal drop-shadow-xs">
                {slide.desc}
              </p>
            </div>

            {/* Right Side Pill CTA Button */}
            <div className="shrink-0">
              <button
                onClick={handleNext}
                className="group flex items-center space-x-2.5 border border-white/80 bg-slate-950/40 hover:bg-white hover:text-slate-950 text-white px-6 py-2.5 rounded-full font-bold text-xs backdrop-blur-md transition-all duration-300 active:scale-95 shadow-xl"
              >
                <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-current group-hover:border-l-slate-950 transition-colors" />
                <span>{slide.ctaText}</span>
              </button>
            </div>

          </div>

          {/* ================= NAVIGATION CONTROLS BAR (POSITIONS DIRECTLY BELOW CONTENT) ================= */}
          <div className="pt-6 sm:pt-8 border-t border-white/15 flex items-center justify-between">
            
            {/* Left Slide Counter: e.g. 01 / 03 */}
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-black text-white tracking-wider">
                0{currentSlide + 1}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 0{slides.length}</span>
            </div>

            {/* Center Stepper Dots */}
            <div className="flex space-x-2 items-center">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Right Navigation Arrows */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className={`w-9 h-9 rounded-full border border-white/20 flex items-center justify-center transition-all ${
                  currentSlide === 0 
                    ? 'opacity-30 cursor-not-allowed text-slate-500' 
                    : 'hover:bg-white/20 text-white active:scale-90'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full border border-white/40 bg-white/10 text-white flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 transition-all active:scale-90 shadow-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
