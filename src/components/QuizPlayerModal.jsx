import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, 
  ShieldCheck, HelpCircle, FileText, X, Sparkles, Lock, ArrowRight, ArrowLeft
} from 'lucide-react';

export default function QuizPlayerModal({ quiz, user, onClose, onSubmitQuiz }) {
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState((quiz?.durationMinutes || 15) * 60);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Timer Countdown Effect (only starts when isTestStarted === true)
  useEffect(() => {
    if (!isTestStarted || submittedResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestStarted, timeLeft, submittedResult]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionValue,
    }));
  };

  const handleEssayChange = (questionId, textValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: textValue,
    }));
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

  const handleAutoSubmit = () => {
    processFinalSubmit();
  };

  const processFinalSubmit = () => {
    const finalScore = calculateScore();
    const submissionObj = {
      id: `SUB-${Date.now().toString().slice(-4)}`,
      quizId: quiz.id,
      participantId: user?.id || 'USR-LOCAL',
      participantName: user?.name || 'Peserta Pelatihan',
      participantEmail: user?.email || 'peserta@mail.com',
      score: finalScore,
      submittedAt: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      isLocked: true,
      answers: answers
    };

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err) {
      // confetti fallback
    }

    setSubmittedResult(submissionObj);
    setIsSubmitConfirmOpen(false);

    if (onSubmitQuiz) {
      onSubmitQuiz(submissionObj);
    }
  };

  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim !== '').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col min-h-screen overflow-y-auto font-sans animate-in fade-in duration-200">
      
      {/* FULL-WIDTH TOP HEADER BAR */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-3.5 overflow-hidden">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
            title="Keluar dari Quiz"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
          <div className="h-6 w-px bg-slate-700 hidden sm:block" />
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                quiz?.type === 'pretest' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {quiz?.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}
              </span>
              <span className="text-xs text-slate-400 font-medium">PresenTrain Portal Ujian</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {quiz?.title}
            </h1>
          </div>
        </div>

        {/* Live Timer Countdown Badge */}
        {isTestStarted && !submittedResult && (
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border shrink-0 font-mono text-sm sm:text-base font-bold shadow-inner ${
            timeLeft < 180 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}

        {(!isTestStarted || submittedResult) && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Tutup Halaman"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* FULL-PAGE BODY CONTENT */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {!isTestStarted ? (
          /* SCREEN 1: PRE-QUIZ INFORMATION & INSTRUCTIONS (FULL-PAGE VIEW) */
          <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1 flex flex-col justify-between">
            <div className="space-y-8">
              
              {/* Page Title & Intro Header */}
              <div className="space-y-3 border-b border-slate-200 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-200">
                    Informasi & Aturan Pengerjaan
                  </span>
                  <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-full">
                    {quiz?.type === 'pretest' ? 'Pre-Test Evaluasi' : 'Post-Test Evaluasi'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {quiz?.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                  {quiz?.description || 'Silakan pelajari informasi dan aturan di bawah ini secara mendalam sebelum Anda memulai sesi ujian.'}
                </p>
              </div>

              {/* Stats Key Metric Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Durasi Ujian</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {quiz?.durationMinutes || 15} <span className="text-xs font-normal text-slate-500">Menit</span>
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Jumlah Soal</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {questions.length} <span className="text-xs font-normal text-slate-500">Butir</span>
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Passing Grade</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {quiz?.passingGrade || 70} <span className="text-xs font-normal text-slate-500">/ 100</span>
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Akun Peserta</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate" title={user?.name}>
                    {user?.name || 'Peserta'}
                  </div>
                </div>
              </div>

              {/* Instructions Content (Clean document layout) */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  <span>Petunjuk & Aturan Dari Administrator</span>
                </h3>

                <div className="border-l-4 border-emerald-600 pl-4 py-1 space-y-3">
                  <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    {quiz?.instructions || (
                      `1. Pastikan koneksi internet Anda stabil sebelum menekan tombol mulai.\n2. Waktu pengerjaan (${quiz?.durationMinutes || 15} Menit) baru akan berjalan setelah Anda menekan tombol "Mulai Dikerjakan Sekarang".\n3. Bacalah setiap pertanyaan dengan cermat sebelum memilih opsi atau menuliskan jawaban essay.\n4. Jawaban akan otomatis disimpan dan dikunci begitu Anda memilih Submit atau saat durasi waktu habis.`
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start space-x-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Perhatian Penting:</strong> Begitu Anda mengklik tombol <span className="underline font-bold">"Mulai Dikerjakan Sekarang"</span>, hitungan mundur durasi ujian akan langsung berjalan dan tidak dapat dihentikan.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                Batal / Kembali ke Dashboard
              </button>

              <button
                onClick={() => setIsTestStarted(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2.5 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span>Mulai Dikerjakan Sekarang</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : submittedResult ? (
          /* SCREEN 2: RESULT SUMMARY SCREEN (FULL-PAGE VIEW) */
          <div className="max-w-2xl mx-auto w-full p-6 sm:p-12 flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/10 border border-emerald-200 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                Submission Berhasil & Terkunci
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Quiz Telah Selesai Dikerjakan!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
                Terima kasih, <strong>{user?.name}</strong>. Seluruh jawaban Anda telah tersimpan secara permanen ke dalam sistem evaluasi pelatihan.
              </p>
            </div>

            {/* Score Metric Card */}
            <div className="w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Perolehan Nilai Akhir</span>
              <div className="text-6xl font-black text-emerald-600 tracking-tight">
                {submittedResult.score} <span className="text-2xl font-bold text-slate-400">/ 100</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Status Jawaban: <strong className="text-slate-800 font-bold">Locked (Dikunci Permanen)</strong></span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left max-w-lg flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Integritas Penilaian Protected:</strong> Nilai kuis ini tidak dapat diubah sepihak oleh Administrator Panitia. Jika terjadi kesalahan teknis, perubahan memerlukan verifikasi dari Super Admin.
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] cursor-pointer"
            >
              Kembali ke Dashboard Pelatihan
            </button>
          </div>
        ) : (
          /* SCREEN 3: ACTIVE QUESTIONS PLAYER (FULL-PAGE VIEW) */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl w-full mx-auto p-4 sm:p-6 gap-6">
            
            {/* Question Navigation Sidebar */}
            <div className="w-full md:w-72 bg-white rounded-3xl border border-slate-200/80 p-5 shrink-0 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
                  <span>Navigasi Soal</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{answeredCount} / {questions.length} Terisi</span>
                </div>

                <div className="grid grid-cols-5 md:grid-cols-4 gap-2.5">
                  {questions.map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = idx === currentQuestionIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-11 rounded-2xl font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer border ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500 ring-offset-2'
                            : isAnswered
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Submit Action */}
              <div className="pt-4 border-t border-slate-100 mt-6">
                <button
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/15 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesaikan & Submit Ujian</span>
                </button>
              </div>
            </div>

            {/* Question Display Content Panel */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs overflow-y-auto">
              <div className="space-y-6">
                
                {/* Question Info Top Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Soal No. {currentQuestionIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Bobot: {currentQuestion?.scoreWeight || 25} Poin
                  </span>
                </div>

                {/* Question Prompt */}
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-relaxed">
                  {currentQuestion?.text}
                </h3>

                {/* Question Options or Essay Input */}
                {currentQuestion?.type === 'multiple_choice' ? (
                  <div className="space-y-3 pt-2">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(currentQuestion.id, opt)}
                          className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border text-sm font-medium transition-all flex items-center space-x-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-500/30'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span>{opt}</span>
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
                      rows={6}
                      value={answers[currentQuestion?.id] || ''}
                      onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                      placeholder="Tuliskan uraian jawaban Anda secara jelas dan lengkap di sini..."
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white text-sm font-medium leading-relaxed shadow-inner"
                    />
                  </div>
                )}
              </div>

              {/* Prev / Next Navigation */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Soal Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit & Selesai</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT CONFIRMATION DIALOG */}
        {isSubmitConfirmOpen && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-3 text-amber-600">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Konfirmasi Submit Quiz</h4>
                  <p className="text-xs text-slate-500">Pastikan seluruh soal telah Anda periksa kembali.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
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
                Setelah disubmit, jawaban Anda akan terkunci secara otomatis dan nilai langsung dikalkulasi.
              </p>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setIsSubmitConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Periksa Lagi
                </button>
                <button
                  onClick={processFinalSubmit}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Ya, Submit Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
