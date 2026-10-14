import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { 
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, 
  ShieldCheck, HelpCircle, FileText, X, Sparkles, Lock, ArrowRight, ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { api } from '@/services/api';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import QueueStatusModal from '@/components/common/QueueStatusModal';

export default function QuizPlayerModal({ quiz, user, existingSubmission = null, onClose, onSubmitQuiz, onQueueSuccess }) {
  const [isTestStarted, setIsTestStarted] = useState(!!existingSubmission);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  
  // Fungsi seed shuffle deterministik berdasarkan ID kuis dan ID pengguna
  const getDeterministicShuffled = (rawQuestions, seedStr) => {
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];
    const list = [...rawQuestions];
    // Simple 32-bit FNV-like / PRNG hash seed
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
      seed |= 0;
    }
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return Math.abs(seed / 233280);
    };

    // Fisher-Yates shuffle untuk mengacak urutan nomor soal dengan PRNG deterministik per peserta
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRandom() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    // Urutan opsi jawaban (A, B, C, D) tetap dipertahankan urut dari atas sesuai aslinya (tidak diacak)
    return list;
  };

  const [shuffledQuestions, setShuffledQuestions] = useState(() => {
    const raw = quiz?.questions || [];
    const quizKey = quiz?.id || quiz?.db_id || 'quiz';
    const userKey = user?.id || user?.db_id || 'guest';
    
    // Coba ambil urutan tersimpan dari sesi jika sedang berlangsung
    try {
      const cached = localStorage.getItem(`quiz_shuffled_order_${quizKey}_${userKey}`);
      if (cached) {
        const parsedOrder = JSON.parse(cached);
        if (Array.isArray(parsedOrder) && parsedOrder.length === raw.length) {
          return parsedOrder;
        }
      }
    } catch (e) {}

    const shuffled = getDeterministicShuffled(raw, `${quizKey}_${userKey}`);
    try {
      localStorage.setItem(`quiz_shuffled_order_${quizKey}_${userKey}`, JSON.stringify(shuffled));
    } catch (e) {}
    return shuffled;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(existingSubmission?.answers || {});
  const [timeLeft, setTimeLeft] = useState((quiz?.durationMinutes || 15) * 60);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isTimeOutModalOpen, setIsTimeOutModalOpen] = useState(false);
  const [tabViolationCount, setTabViolationCount] = useState(existingSubmission?.tabViolations || 0);
  const [tabViolationModal, setTabViolationModal] = useState({ open: false, count: 0, isReload: false });
  const [submittedResult, setSubmittedResult] = useState(existingSubmission || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submitError, setSubmitError] = useState('');
  const pendingSubmissionRef = useRef(null);

  // Smart Polling Queue for Quiz Submissions
  const {
    status: quizQueueStatus,
    progressPercent: quizQueueProgress,
    message: quizQueueMessage,
    startPolling: startQuizPolling,
    isLoading: isQuizQueueLoading,
    isCompleted: isQuizQueueCompleted,
    isFailed: isQuizQueueFailed,
    reset: resetQuizQueue,
  } = useSmartPolling({
    onSuccess: (result) => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (err) {}

      try {
        const quizKey = quiz?.id || quiz?.db_id;
        sessionStorage.removeItem('active_playing_quiz_id');
        if (quizKey) {
          sessionStorage.removeItem(`quiz_in_progress_${quizKey}`);
          localStorage.removeItem(`quiz_draft_answers_${quizKey}_${user?.id}`);
        }
      } catch (e) {}

      const merged = pendingSubmissionRef.current ? { ...pendingSubmissionRef.current, ...result } : result;
      setSubmittedResult(merged);
      if (typeof onQueueSuccess === 'function') {
        try {
          onQueueSuccess(merged);
        } catch (e) {}
      }
      setIsSubmitConfirmOpen(false);
      setIsTimeOutModalOpen(false);
      setTabViolationModal({ open: false, count: 0, isReload: false });
    },
    onError: (err) => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(err.message || 'Proses penilaian kuis dalam antrean gagal. Silakan coba kirim lagi.');
    }
  });

  const lastViolationTimeRef = useRef(0);
  const tabViolationCountRef = useRef(existingSubmission?.tabViolations || 0);

  useEffect(() => {
    tabViolationCountRef.current = tabViolationCount;
  }, [tabViolationCount]);

  // Cek apakah halaman baru saja di-refresh saat ujian sedang berjalan
  useEffect(() => {
    const quizKey = quiz?.id || quiz?.db_id;
    if (!quizKey) return;

    let wasInProgress = false;
    try {
      wasInProgress = sessionStorage.getItem(`quiz_in_progress_${quizKey}`) === 'true';
    } catch (e) {}

    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        isReload = navEntries[0].type === 'reload';
      } else if (window.performance && window.performance.navigation) {
        isReload = window.performance.navigation.type === 1;
      }
    } catch (e) {}

    // Jika sedang mengerjakan dan di-refresh: kembalikan draft jawaban & langsung peringatan 3 (wajib submit)
    if (wasInProgress && isReload && !existingSubmission) {
      try {
        const savedDraft = localStorage.getItem(`quiz_draft_answers_${quizKey}_${user?.id}`);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed === 'object') {
            setAnswers(parsed);
          }
        }
      } catch (e) {}

      setIsTestStarted(true);
      setTabViolationCount(3);
      tabViolationCountRef.current = 3;
      setTabViolationModal({ open: true, count: 3, isReload: true });
    }
  }, [quiz, existingSubmission, user]);

  const questions = shuffledQuestions.length > 0 ? shuffledQuestions : (quiz?.questions || []);
  const currentQuestion = questions[currentQuestionIndex];

  // Sembunyikan Mobile Bottom Dock selama pengisian kuis aktif
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('quiz-taking-active');
    }

    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('quiz-taking-active');
      }
    };
  }, []);

  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (tabViolationModal.open && tabViolationModal.count >= 3) {
          return;
        }
        if (isExitConfirmOpen) {
          setIsExitConfirmOpen(false);
          return;
        }
        if (isSubmitConfirmOpen) {
          setIsSubmitConfirmOpen(false);
          return;
        }
        if (!isTestStarted || submittedResult) {
          handleForceClose();
        } else {
          handleRequestExit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitConfirmOpen, isExitConfirmOpen, isTestStarted, submittedResult, tabViolationModal.open]);

  // Cegah browser refresh / navigate / tutup tab secara tak sengaja saat tes sedang berjalan
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isTestStarted && !submittedResult) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTestStarted, submittedResult]);

  // Request keluar: Jika tes sedang berjalan & belum selesai submit, tampilkan konfirmasi peringatan
  const handleRequestExit = () => {
    if (isTestStarted && !submittedResult) {
      if (tabViolationCount >= 3) return; // Wajib submit jika pelanggaran penuh
      setIsExitConfirmOpen(true);
      return;
    }
    handleForceClose();
  };

  const handleForceClose = () => {
    if (isTestStarted && !submittedResult && tabViolationCount >= 3) {
      return;
    }
    try {
      const quizKey = quiz?.id || quiz?.db_id;
      sessionStorage.removeItem('active_playing_quiz_id');
      if (quizKey) {
        sessionStorage.removeItem(`quiz_in_progress_${quizKey}`);
        localStorage.removeItem(`quiz_draft_answers_${quizKey}_${user?.id}`);
        localStorage.removeItem(`quiz_shuffled_order_${quizKey}_${user?.id || user?.db_id || 'guest'}`);
      }
    } catch (e) {}
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('quiz-taking-active');
    }
    setIsExitConfirmOpen(false);
    onClose();
  };

  // Timer Countdown Effect (only starts when isTestStarted === true)
  useEffect(() => {
    if (!isTestStarted || submittedResult || timeLeft <= 0 || isTimeOutModalOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeOutModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestStarted, timeLeft, submittedResult, isTimeOutModalOpen]);

  // Anti-Cheat: Detect Tab Switch (Batas 2x Peringatan bertahap, Ke-3x Wajib Submit)
  useEffect(() => {
    if (!isTestStarted || submittedResult || isTimeOutModalOpen) return;

    const triggerViolation = () => {
      if (submittedResult) return;
      // Jangan re-trigger jika modal peringatan SEDANG tampil di layar
      if (tabViolationModal.open) return;

      // Cooldown 3 detik untuk mencegah lonjakan peringatan ganda akibat event browser bersamaan
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 3000) {
        return;
      }
      lastViolationTimeRef.current = now;

      const currentCount = tabViolationCountRef.current;
      const nextCount = currentCount + 1;
      tabViolationCountRef.current = nextCount;
      setTabViolationCount(nextCount);

      if (nextCount === 1) {
        setTabViolationModal({ open: true, count: 1, isReload: false });
      } else if (nextCount === 2) {
        setTabViolationModal({ open: true, count: 2, isReload: false });
      } else if (nextCount >= 3) {
        setTabViolationModal({ open: true, count: 3, isReload: false });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerViolation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTestStarted, submittedResult, isTimeOutModalOpen, tabViolationModal.open]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionValue) => {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: optionValue,
      };
      try {
        const quizKey = quiz?.id || quiz?.db_id;
        if (quizKey) {
          localStorage.setItem(`quiz_draft_answers_${quizKey}_${user?.id}`, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const handleEssayChange = (questionId, textValue) => {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: textValue,
      };
      try {
        const quizKey = quiz?.id || quiz?.db_id;
        if (quizKey) {
          localStorage.setItem(`quiz_draft_answers_${quizKey}_${user?.id}`, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (q.type === 'multiple_choice') {
        if (answers[q.id] === q.correctAnswer) {
          score += q.scoreWeight || 25;
        }
      } else if (q.type === 'essay') {
        if (answers[q.id] && answers[q.id].trim().length > 5) {
          score += q.scoreWeight || 25;
        }
      }
    });
    return Math.min(score, 100);
  };

  const processFinalSubmit = async (reasonArg = 'normal') => {
    // Cegah double submit secara mutlak (state & synchronous ref)
    if (isSubmitting || isSubmittingRef.current || submittedResult) return;
    isSubmittingRef.current = true;
    let reason = typeof reasonArg === 'string' ? reasonArg : 'normal';
    if (tabViolationCount >= 3 && reason === 'normal') {
      reason = 'tab_violation';
    }

    const finalScore = calculateScore();
    const submissionObj = {
      id: existingSubmission?.id || `SUB-${Date.now().toString().slice(-4)}`,
      quizId: quiz.id,
      quiz_id: quiz.db_id || quiz.id,
      participantId: user?.id || (user?.db_id ? `USR-${user.db_id}` : 'USR-LOCAL'),
      user_id: user?.db_id || user?.id || null,
      participantName: user?.name || 'Peserta Pelatihan',
      participantEmail: user?.email || 'peserta@mail.com',
      score: finalScore,
      submittedAt: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      isLocked: true,
      answers: answers,
      submitReason: reason,
      tabViolations: tabViolationCount
    };

    setIsSubmitting(true);
    setSubmitError('');

    let saved = true;
    let serverSub = null;
    if (onSubmitQuiz) {
      try {
        const result = await onSubmitQuiz(submissionObj);
        if (result && result.ok === false) {
          saved = false;
        } else if (result && result.queued && result.ticket_id) {
          // Masuk antrean background server
          pendingSubmissionRef.current = submissionObj;
          startQuizPolling(result.ticket_id);
          return;
        } else if (result && result.data) {
          serverSub = result.data;
        }
      } catch (err) {
        saved = false;
      }
    }

    setIsSubmitting(false);

    if (!saved) {
      isSubmittingRef.current = false;
      // Jawaban TETAP di layar; peserta bisa mencoba kirim ulang
      setSubmitError('Jawaban belum berhasil terkirim ke server. Periksa koneksi internet lalu coba kirim lagi. Jawaban Anda tidak hilang.');
      return;
    }

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err) {
      // confetti fallback
    }

    try {
      const quizKey = quiz?.id || quiz?.db_id;
      sessionStorage.removeItem('active_playing_quiz_id');
      if (quizKey) {
        sessionStorage.removeItem(`quiz_in_progress_${quizKey}`);
        localStorage.removeItem(`quiz_draft_answers_${quizKey}_${user?.id}`);
      }
    } catch (e) {}

    setSubmittedResult(serverSub ? { ...submissionObj, ...serverSub } : submissionObj);
    setIsSubmitConfirmOpen(false);
    setIsTimeOutModalOpen(false);
    setIsMobileQuestionSheetOpen(false);
    setTabViolationModal({ open: false, count: 0, isReload: false });
  };

  const answeredCount = Object.keys(answers).filter(k => answers[k] && String(answers[k]).trim() !== '').length;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col h-full h-dvh overflow-hidden font-sans animate-in fade-in duration-200">
      
      {/* FULL-WIDTH TOP HEADER BAR (LIGHT THEME) */}
      <header className="bg-white text-slate-900 px-3.5 sm:px-8 py-3 flex items-center justify-between shrink-0 border-b border-slate-200 shadow-xs z-20">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <button 
            onClick={handleRequestExit}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-bold shrink-0"
            title="Keluar dari Quiz"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />
          
          <div className="truncate">
            <span className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight">
              {quiz?.type === 'pretest' || quiz?.type === 'pre_test' ? 'Pre-Test' : (quiz?.type === 'midtest' || quiz?.type === 'mid_test' || quiz?.type === 'evaluasi' ? 'Mid-Test' : (quiz?.type === 'quiz' ? 'Quiz Materi' : 'Post-Test'))}
            </span>
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium ml-2">
              • {quiz?.title}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Live Timer Countdown Badge (Light Theme) */}
          {isTestStarted && !submittedResult && (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border shrink-0 font-mono text-xs sm:text-sm font-bold shadow-xs ${
              timeLeft < 180 ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' : 'bg-slate-100 text-emerald-800 border-slate-200'
            }`}>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {(!isTestStarted || submittedResult) && (
            <button
              onClick={handleForceClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title="Tutup Halaman"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* FULL-PAGE BODY CONTENT */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
        {!isTestStarted ? (
          /* SCREEN 1: PRE-QUIZ INFORMATION & INSTRUCTIONS (FULL-PAGE VIEW) */
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
            <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-4 sm:space-y-8 flex-1 flex flex-col justify-between pb-32 sm:pb-8">
              <div className="space-y-4 sm:space-y-8">
                
                {/* Page Title & Intro Header */}
                <div className="space-y-2 sm:space-y-3 border-b border-slate-200 pb-4 sm:pb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] sm:text-xs rounded-full border border-emerald-200">
                      Informasi & Aturan Pengerjaan
                    </span>
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-slate-200 text-slate-700 font-bold text-[10px] sm:text-xs rounded-full">
                      {quiz?.type === 'pretest' || quiz?.type === 'pre_test' ? 'Pre-Test Evaluasi' : (quiz?.type === 'midtest' || quiz?.type === 'mid_test' || quiz?.type === 'evaluasi' ? 'Mid-Test Evaluasi' : (quiz?.type === 'quiz' ? 'Quiz Materi' : 'Post-Test Evaluasi'))}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {quiz?.title}
                  </h2>
                  <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-4xl">
                    {quiz?.description || 'Silakan pelajari informasi dan aturan di bawah ini secara mendalam sebelum Anda memulai sesi ujian.'}
                  </p>
                </div>

                {/* Stats Key Metric Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span>Durasi Ujian</span>
                    </div>
                    <div className="text-base sm:text-xl font-extrabold text-slate-900">
                      {quiz?.durationMinutes || 15} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Menit</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span>Jumlah Soal</span>
                    </div>
                    <div className="text-base sm:text-xl font-extrabold text-slate-900">
                      {questions.length} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Butir</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span>Passing Grade</span>
                    </div>
                    <div className="text-base sm:text-xl font-extrabold text-slate-900">
                      {quiz?.passingGrade || 70} <span className="text-[10px] sm:text-xs font-normal text-slate-500">/ 100</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span>Akun Peserta</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={user?.name}>
                      {user?.name || 'Peserta'}
                    </div>
                  </div>
                </div>

                {/* Instructions Content (Clean document layout) */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-xs sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                    <span>Petunjuk & Aturan Dari Administrator</span>
                  </h3>

                  <div className="border-l-4 border-emerald-600 pl-3 sm:pl-4 py-0.5 space-y-2">
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
                      {quiz?.instructions || (
                        `1. KONEKSI & PERANGKAT: Pastikan koneksi internet Anda stabil sebelum menekan tombol mulai.\n2. DURASI UJIAN: Waktu pengerjaan (${quiz?.durationMinutes || 15} Menit) berjalan sejak Anda mengklik "Mulai Dikerjakan Sekarang". Apabila waktu habis, kotak konfirmasi penyerahan akan langsung muncul untuk mengumpulkan lembar jawaban Anda.\n3. INTEGRITAS & ANTI-KECURANGAN: Dilarang keras berpindah tab browser atau beralih ke aplikasi lain selama ujian. Sistem mencatat perpindahan tab dengan batas maksimal 2x peringatan. Pada percobaan ke-3, ujian akan otomatis dihentikan dan jawaban langsung disubmit.\n4. PENGUNCIAN HASIL: Begitu ujian disubmit, jawaban bersifat final, terkunci secara permanen, dan siap diperiksa oleh Administrator Panitia.`
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start space-x-2.5 sm:space-x-3.5">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-snug sm:leading-normal">
                      <strong>Perhatian Penting:</strong> Begitu Anda mengklik tombol <span className="underline font-bold">"Mulai Dikerjakan Sekarang"</span>, hitungan mundur durasi ujian dan deteksi anti-kecurangan tab browser akan langsung aktif.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar (Sticky & Raised on Mobile with Safe Area Support) */}
              <div className="sticky bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md p-3.5 sm:p-0 border-t border-slate-200 sm:border-t-0 shadow-lg sm:shadow-none sm:relative sm:bg-transparent mt-4 sm:mt-8 pb-[max(16px,calc(12px+env(safe-area-inset-bottom,0px)))] sm:pb-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4 -mx-4 -mb-4 sm:mx-0 sm:mb-0">
                <button
                  onClick={handleForceClose}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer text-center flex items-center justify-center active:scale-98"
                >
                  Batal / Kembali ke Dashboard
                </button>

                <button
                  disabled={isStartingQuiz}
                  onClick={async () => {
                    setIsStartingQuiz(true);
                    try {
                      const res = await api.startQuiz(quiz.id || quiz.db_id);
                      if (res && res.ok === false) {
                        alert(res.message || 'Kuis saat ini DITUTUP oleh Administrator untuk kelas Anda.');
                        handleForceClose();
                        return;
                      }
                      if (res && res.data) {
                        if (Array.isArray(res.data.questions) && res.data.questions.length > 0) {
                          setShuffledQuestions(res.data.questions);
                        }
                        if (res.data.expires_at) {
                          const diffSec = Math.max(10, Math.floor((new Date(res.data.expires_at).getTime() - Date.now()) / 1000));
                          setTimeLeft(diffSec);
                        }
                      }
                      const quizKey = quiz.id || quiz.db_id;
                      try {
                        sessionStorage.setItem('active_playing_quiz_id', String(quizKey));
                        sessionStorage.setItem(`quiz_in_progress_${quizKey}`, 'true');
                      } catch (e) {}
                      setIsTestStarted(true);
                    } catch (err) {
                      console.warn('API startQuiz error:', err);
                      const errMsg = err?.response?.data?.message || err?.message;
                      if (errMsg && (errMsg.toLowerCase().includes('tutup') || errMsg.toLowerCase().includes('ditutup'))) {
                        alert(errMsg);
                        handleForceClose();
                        return;
                      }
                      // Fallback client start jika error koneksi non-access
                      const quizKey = quiz.id || quiz.db_id;
                      try {
                        sessionStorage.setItem('active_playing_quiz_id', String(quizKey));
                        sessionStorage.setItem(`quiz_in_progress_${quizKey}`, 'true');
                      } catch (e) {}
                      setIsTestStarted(true);
                    } finally {
                      setIsStartingQuiz(false);
                    }
                  }}
                  className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isStartingQuiz ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Soal Acak...</span>
                    </>
                  ) : (
                    <>
                      <span>Mulai Dikerjakan Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : submittedResult ? (
          /* SCREEN 2: RESULT SUMMARY SCREEN (FULL-PAGE VIEW) */
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
            <div className="max-w-4xl mx-auto w-full p-6 sm:p-12 flex-1 flex flex-col items-center justify-center text-center space-y-6 pb-24 sm:pb-12">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 stroke-[2.2]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Quiz Telah Selesai Dikerjakan!
                </h2>
                <p className="text-xs sm:text-base text-slate-600 max-w-lg mx-auto">
                  Terima kasih, <strong>{user?.name}</strong>. Seluruh jawaban Anda telah berhasil tersimpan secara permanen ke dalam sistem.
                </p>
              </div>

              {/* Status Metric Card & Hasil Nilai */}
              <div className="w-full max-w-md bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-center space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Skor Hasil Pengerjaan Anda</span>
                  <div className="text-4xl font-black text-emerald-800">
                    {submittedResult.score ?? submittedResult.final_score ?? '-'}
                    <span className="text-sm font-semibold text-emerald-600 ml-1">/ 100</span>
                  </div>
                  <div className="text-[11px] font-medium text-emerald-700">
                    Passing Grade: {quiz?.passingGrade || 70} Poin
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs flex items-center justify-between font-semibold">
                  <span>Status:</span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px]">Selesai Dikirim</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs flex items-center justify-between font-semibold">
                  <span>Waktu Submit:</span>
                  <span className="text-slate-900 font-bold">{submittedResult.submittedAt || submittedResult.submitted_at || 'Baru Saja'}</span>
                </div>

                {submittedResult.submitReason && submittedResult.submitReason !== 'normal' && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-semibold text-center">
                    {submittedResult.submitReason === 'reload_violation' 
                      ? 'Disubmit Otomatis Karena Halaman Dimuat Ulang (Refresh)'
                      : submittedResult.submitReason === 'time_out'
                      ? 'Disubmit Otomatis Karena Waktu Ujian Berakhir'
                      : 'Disubmit Otomatis Karena Peringatan Integritas Tab'}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                  Jawaban Anda tersimpan secara rahasia dan telah terkunci di server untuk ditinjau oleh Administrator.
                </p>
              </div>

              <button
                onClick={handleForceClose}
                className="w-full sm:w-auto h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                Kembali ke Dashboard Pelatihan
              </button>
            </div>
          </div>
        ) : (
          /* SCREEN 3: ACTIVE QUESTIONS PLAYER (RESPONSIVE DESKTOP & MOBILE TANPA NAVIGASI SOAL) */
          <div className="flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto md:p-6 relative">
            
            {/* Question Display Content Panel (Full Focus Desktop & Mobile) */}
            <div className="flex-1 bg-white md:rounded-2xl md:border md:border-slate-200/80 p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-xs overflow-y-auto pb-28 md:pb-6">
              <div className="space-y-4 sm:space-y-5">
                
                {/* Question Info Top Bar */}
                <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>Soal {currentQuestionIndex + 1} dari {questions.length}</span>
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Bobot: {currentQuestion?.scoreWeight || 25} Poin
                  </span>
                </div>

                {/* Question Prompt */}
                <h3 className="text-sm sm:text-lg md:text-xl font-extrabold text-slate-900 leading-relaxed">
                  {currentQuestion?.text}
                </h3>

                {/* Question Options or Essay Input */}
                {currentQuestion?.type === 'multiple_choice' ? (
                  <div className="space-y-2 sm:space-y-2.5 pt-1 sm:pt-2">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(currentQuestion.id, opt)}
                          className={`w-full text-left p-3 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center space-x-3 cursor-pointer active:scale-99 ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />}
                          </div>
                          <span className="leading-snug text-xs sm:text-sm">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-2 space-y-2.5">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                      Jawaban Isian / Essay Anda:
                    </label>
                    <textarea
                      rows={3}
                      value={answers[currentQuestion?.id] || ''}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
                        }
                      }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(e.target.scrollHeight, 100)}px`;
                      }}
                      onChange={(e) => {
                        handleEssayChange(currentQuestion.id, e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(e.target.scrollHeight, 100)}px`;
                      }}
                      placeholder="Tuliskan uraian jawaban Anda secara jelas dan lengkap di sini..."
                      className="w-full p-3 sm:p-3.5 bg-white rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 text-xs sm:text-sm font-medium leading-relaxed resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Prev / Next Bottom Navigation Bar (Docked on Mobile with Safe Area, Never Covered) */}
              <div className="fixed md:relative bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 md:border-t md:border-slate-100 p-3 sm:p-3.5 md:p-0 pb-[max(14px,calc(10px+env(safe-area-inset-bottom,0px)))] md:pb-0 md:mt-6 shadow-lg md:shadow-none flex items-center justify-between gap-3">
                {/* Tombol Kembali / Sebelumnya */}
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="flex-1 md:flex-none h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  Sebelumnya
                </button>

                {/* Tombol Lanjut / Selanjutnya / Submit */}
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex-1 md:flex-none h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    Selanjutnya
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="flex-1 md:flex-none h-10 sm:h-11 px-6 sm:px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-98"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL PERINGATAN KELUAR DARI UJIAN */}
        {isExitConfirmOpen && (
          <div 
            onClick={() => setIsExitConfirmOpen(false)}
            className="fixed inset-0 z-[10001] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 shadow-2xl my-auto text-left"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                    Peringatan: Yakin Ingin Keluar?
                  </h4>
                  <p className="text-xs text-rose-600 font-semibold">
                    Sesi tes Anda sedang berlangsung!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-950 space-y-2 leading-relaxed">
                <p>
                  Jika Anda keluar sekarang:
                </p>
                <ul className="list-disc pl-4 space-y-1 font-medium text-slate-800">
                  <li>
                    <strong>Seluruh jawaban yang telah Anda isi ({answeredCount} dari {questions.length} soal) akan hilang.</strong>
                  </li>
                  <li>
                    Anda harus <strong>mengisi ulang dari awal</strong> saat kuis dibuka kembali.
                  </li>
                  <li>
                    Waktu ujian yang telah berjalan tidak dapat diulang.
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs flex justify-between items-center font-medium">
                <span>Jawaban Anda saat ini:</span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {answeredCount} / {questions.length} Butir Terisi
                </span>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleForceClose}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:bg-rose-100 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Ya, Keluar & Reset Isian
                </button>
                <button
                  type="button"
                  onClick={() => setIsExitConfirmOpen(false)}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Lanjut Mengerjakan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT CONFIRMATION DIALOG */}
        {isSubmitConfirmOpen && (
          <div 
            onClick={() => setIsSubmitConfirmOpen(false)}
            className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl my-auto max-h-[90dvh] overflow-y-auto"
            >
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base sm:text-lg">Konfirmasi Submit Quiz</h4>
                <p className="text-xs text-slate-500">Pastikan seluruh soal telah Anda periksa kembali.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Total Soal:</span>
                  <strong className="font-bold">{questions.length} Soal</strong>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Soal Terisi:</span>
                  <strong className="font-bold">{answeredCount} Soal</strong>
                </div>
                {questions.length - answeredCount > 0 && (
                  <div className="flex justify-between text-rose-600 pt-1 border-t border-slate-200">
                    <span>Soal Belum Terisi:</span>
                    <strong className="font-bold">{questions.length - answeredCount} Soal</strong>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600">
                Setelah disubmit, jawaban Anda akan terkirim dan dikunci secara otomatis untuk direview oleh administrator.
              </p>

              {submitError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setIsSubmitConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Periksa Lagi
                </button>
                <button
                  onClick={() => processFinalSubmit('normal')}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Mengirim...' : (submitError ? 'Kirim Ulang' : 'Submit Sekarang')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: WAKTU UJIAN TELAH HABIS */}
        {isTimeOutModalOpen && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 shadow-2xl text-left">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">Waktu Ujian Telah Habis!</h4>
                <p className="text-xs text-slate-500">Durasi pengerjaan Anda telah selesai.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Total Soal:</span>
                  <strong className="font-bold">{questions.length} Butir</strong>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Soal Terisi:</span>
                  <strong className="font-bold">{answeredCount} Butir</strong>
                </div>
                {questions.length - answeredCount > 0 && (
                  <div className="flex justify-between text-rose-600 pt-1 border-t border-slate-200">
                    <span>Soal Belum Terisi:</span>
                    <strong className="font-bold">{questions.length - answeredCount} Butir</strong>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh butir jawaban yang telah Anda pilih/isi akan langsung dikumpulkan dan dikunci secara otomatis ke database panitia.
              </p>

              {submitError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{submitError}</p>
              )}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => processFinalSubmit('time_out')}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Mengirim...' : (submitError ? 'Kirim Ulang' : 'Kumpulkan Jawaban Sekarang')}</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL 3: ANTI-CHEAT PERINGATAN PINDAH TAB BROWSER / APLIKASI LAIN */}
        {tabViolationModal.open && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className={`bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-left ${
              tabViolationModal.count >= 3 
                ? 'border-rose-400' 
                : tabViolationModal.count === 2 
                  ? 'border-amber-400' 
                  : 'border-yellow-300'
            }`}>
              
              <div className="space-y-1.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  tabViolationModal.count >= 3
                    ? 'bg-rose-100 text-rose-800'
                    : tabViolationModal.count === 2
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {tabViolationModal.isReload 
                    ? 'Muat Ulang (Refresh) Terdeteksi' 
                    : tabViolationModal.count >= 3 
                      ? 'Diskualifikasi / Wajib Submit' 
                      : `Percobaan ${tabViolationModal.count} dari 2`
                  }
                </span>
                
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                  {tabViolationModal.isReload
                    ? 'Ujian Telah Dimuat Ulang (Refresh)'
                    : tabViolationModal.count >= 3 
                      ? 'Batas Toleransi Berpindah Tab Terlampaui (3x)'
                      : tabViolationModal.count === 2
                        ? 'Peringatan Keras Terakhir (2 dari 2)'
                        : 'Peringatan Integritas Ujian (1 dari 2)'
                  }
                </h4>
              </div>

              <div className={`p-4 rounded-xl text-xs leading-relaxed font-medium ${
                tabViolationModal.count >= 3 
                  ? 'bg-rose-50 text-rose-900 border border-rose-200' 
                  : tabViolationModal.count === 2 
                    ? 'bg-amber-50 text-amber-900 border border-amber-200' 
                    : 'bg-yellow-50 text-yellow-900 border border-yellow-200'
              }`}>
                {tabViolationModal.isReload ? (
                  <p>
                    Sistem mendeteksi bahwa <strong>halaman ujian telah di-refresh / dimuat ulang</strong> saat kuis sedang berlangsung. Demi menjaga keadilan dan integritas evaluasi, lembar kuis langsung dikunci dan Anda wajib segera mengumpulkan jawaban saat ini ke database panitia.
                  </p>
                ) : tabViolationModal.count >= 3 ? (
                  <p>
                    Sistem mendeteksi <strong>3 kali perpindahan tab browser atau beralih aplikasi</strong> selama ujian berlangsung. Demi menjaga keadilan dan integritas evaluasi, ujian Anda langsung dihentikan dan jawaban saat ini wajib dikumpulkan ke database panitia.
                  </p>
                ) : tabViolationModal.count === 2 ? (
                  <p>
                    <strong>PERINGATAN KERAS:</strong> Anda terdeteksi beralih aplikasi atau membuka tab lain kembali. 
                    Jika Anda berpindah <strong>1 kali lagi</strong>, lembar ujian akan langsung dikunci dan dikumpulkan otomatis oleh sistem!
                  </p>
                ) : (
                  <p>
                    Terdeteksi Anda berpindah tab browser atau beralih ke aplikasi lain. Sistem mencatat kejadian ini. 
                    Anda hanya memiliki <strong>1 kali kesempatan lagi</strong> sebelum ujian dihentikan paksa!
                  </p>
                )}
              </div>

              <div className="pt-2">
                {tabViolationModal.count >= 3 ? (
                  <>
                    {submitError && (
                      <p className="mb-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{submitError}</p>
                    )}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => processFinalSubmit(tabViolationModal.isReload ? 'reload_violation' : 'tab_violation')}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-60"
                    >
                      <span>{isSubmitting ? 'Mengirim...' : (submitError ? 'Kirim Ulang' : 'Kumpulkan Jawaban Sekarang')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTabViolationModal({ open: false, count: 0, isReload: false })}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer text-white ${
                      tabViolationModal.count === 2 
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800' 
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    }`}
                  >
                    {tabViolationModal.count === 2 
                      ? 'Saya Mengerti, Kembali ke Ujian (Kesempatan Terakhir)' 
                      : 'Saya Mengerti, Lanjutkan Ujian'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Async Queue Status Modal for Quiz Submit */}
        <QueueStatusModal
          isOpen={isQuizQueueLoading || isQuizQueueCompleted || isQuizQueueFailed}
          status={quizQueueStatus}
          progressPercent={quizQueueProgress}
          message={quizQueueMessage}
          onClose={resetQuizQueue}
          title="Menyimpan Jawaban Kuis"
        />
      </main>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
