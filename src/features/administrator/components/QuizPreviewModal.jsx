import React, { useState, useEffect } from 'react';
import { 
  X, Clock, Award, FileText, Copy, Check, Edit, 
  ChevronLeft, ChevronRight, RotateCcw, 
  BarChart3, Sparkles, ArrowLeft
} from 'lucide-react';
import { isAnswerMatch } from './QuizResultsView';

export default function QuizPreviewModal({ 
  quiz, 
  onClose, 
  onEdit, 
  onViewResults, 
  onCopyLink 
}) {
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'simulation'
  const [isCopied, setIsCopied] = useState(false);

  // Simulation mode states
  const [simIndex, setSimIndex] = useState(0);
  const [simAnswers, setSimAnswers] = useState({});
  const [simCompleted, setSimCompleted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const questionCount = questions.length;
  const currentSimQ = questions[simIndex];
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/quiz/${quiz.linkCode}` : '';

  const handleCopy = () => {
    if (onCopyLink) {
      onCopyLink(quiz.linkCode);
    } else if (fullUrl) {
      navigator.clipboard.writeText(fullUrl);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSimOptionSelect = (qId, opt) => {
    setSimAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const handleSimEssayChange = (qId, text) => {
    setSimAnswers(prev => ({ ...prev, [qId]: text }));
  };

  // Calculate simulation score
  const calculateSimScore = () => {
    let score = 0;
    questions.forEach(q => {
      const weight = parseInt(q.scoreWeight || q.score_weight, 10) || 0;
      const userAns = simAnswers[q.id] || '';
      const correctAns = q.correctAnswer || q.correct_answer || '';
      if (q.type === 'multiple_choice' || !q.type) {
        if (isAnswerMatch(userAns, correctAns, q.options)) {
          score += weight;
        }
      } else {
        // Essay gets points if filled in simulation
        if (userAns && String(userAns).trim().length > 0) {
          score += weight;
        }
      }
    });
    return score;
  };

  const simScore = calculateSimScore();
  const isPassed = simScore >= (quiz.passingGrade || 70);

  return (
    <div className="bg-slate-50 min-h-screen font-sans w-full pb-16 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Kembali ke Daftar Kuis"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  quiz.type === 'pretest' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : quiz.type === 'midtest' || quiz.type === 'evaluasi'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {quiz.type === 'pretest' ? 'Pre-Test' : (quiz.type === 'midtest' || quiz.type === 'evaluasi' ? 'Mid-Test' : 'Post-Test')}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Passing Grade: {quiz.passingGrade || 70} Poin
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                {quiz.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onViewResults && (
              <button
                type="button"
                onClick={() => onViewResults(quiz)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                title="Buka Data Nilai & Responden"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Lihat Nilai</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(quiz)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                title="Buka Editor Kuis"
              >
                <Edit className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Edit Kuis</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Description & Sub Navigation */}
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Lembar Kuis & Simulasi
                </h3>
                {quiz.description && (
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    {quiz.description}
                  </p>
                )}
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveTab('review'); setSimCompleted(false); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'review'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kunci & Pembahasan ({questionCount} Soal)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'simulation'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Simulasi Pengerjaan</span>
                </button>
              </div>
            </div>
          </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          
          {/* TAB 1: REVIEW SOAL & KUNCI JAWABAN */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              {quiz.instructions && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-blue-950">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Petunjuk Pengerjaan:</span>
                  </div>
                  <p className="leading-relaxed pl-5 text-blue-800">{quiz.instructions}</p>
                </div>
              )}

              {questions.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  Belum ada butir pertanyaan yang ditambahkan ke kuis ini.
                </div>
              ) : (
                questions.map((q, idx) => {
                  const isEssay = q.type === 'essay';
                  return (
                    <div 
                      key={q.id || idx} 
                      className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-colors space-y-3.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isEssay 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isEssay ? 'Essay' : 'Pilihan Ganda'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md shrink-0">
                          +{q.scoreWeight || 25} Poin
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.text || '(Pertanyaan belum diisi)'}
                      </p>

                      {/* Options or Essay Reference */}
                      {!isEssay ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt, oIdx) => {
                            const isCorrect = (q.correctAnswer || '').trim().toLowerCase() === (opt || '').trim().toLowerCase();
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200/80 text-slate-700'
                                }`}
                              >
                                <span className="pr-2 leading-snug">{opt}</span>
                                {isCorrect && (
                                  <span className="shrink-0 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-2xs">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    <span>Kunci</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs space-y-1">
                          <span className="font-bold text-amber-900 block">Kunci Acuan Jawaban / Rubrik:</span>
                          <p className="text-amber-950 leading-relaxed">{q.correctAnswer || '-'}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: SIMULASI PENGERJAAN PESERTA */}
          {activeTab === 'simulation' && (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-medium">
                  <strong>Mode Simulasi Pratinjau:</strong> Pengerjaan ini hanya simulasi untuk menguji tampilan kuis dan tidak tersimpan ke database.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSimAnswers({});
                    setSimIndex(0);
                    setSimCompleted(false);
                  }}
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0 ml-3"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ulangi</span>
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Tidak ada pertanyaan untuk disimulasikan.
                </div>
              ) : simCompleted ? (
                /* Simulation Result Screen */
                <div className="p-6 text-center space-y-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                  <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white ${
                    isPassed ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      Simulasi Selesai!
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hasil simulasi pengerjaan Anda:
                    </p>
                  </div>
                  <div className="inline-block p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-3xl font-extrabold text-slate-900">{simScore} Poin</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      Passing Grade: {quiz.passingGrade} Poin • Status:{' '}
                      <span className={isPassed ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                        {isPassed ? 'LULUS' : 'REMEDIAL'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSimCompleted(false);
                        setSimIndex(0);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Coba Simulasi Lagi
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Question Simulation */
                <div className="space-y-4">
                  {/* Progress tracker */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Pertanyaan {simIndex + 1} dari {questionCount}</span>
                    <span className="font-bold text-slate-700">+{currentSimQ.scoreWeight || 25} Poin</span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${((simIndex + 1) / questionCount) * 100}%` }}
                    />
                  </div>

                  {/* Question Card */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                    <h3 className="text-base font-bold text-slate-900 leading-relaxed">
                      {currentSimQ.text}
                    </h3>

                    {currentSimQ.type === 'multiple_choice' ? (
                      <div className="space-y-2 pt-2">
                        {(currentSimQ.options || []).map((opt, oIdx) => {
                          const isSelected = simAnswers[currentSimQ.id] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSimOptionSelect(currentSimQ.id, opt)}
                              className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={4}
                          value={simAnswers[currentSimQ.id] || ''}
                          onChange={(e) => handleSimEssayChange(currentSimQ.id, e.target.value)}
                          placeholder="Ketik simulasi jawaban essay di sini..."
                          className="w-full p-3.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSimIndex(prev => Math.max(0, prev - 1))}
                      disabled={simIndex === 0}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Sebelumnya</span>
                    </button>

                    {simIndex < questionCount - 1 ? (
                      <button
                        type="button"
                        onClick={() => setSimIndex(prev => Math.min(questionCount - 1, prev + 1))}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSimCompleted(true)}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Selesai Simulasi
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Target Nilai: <strong className="text-emerald-700 font-bold">{quiz.passingGrade || 70} Poin</strong> • Durasi: <strong className="text-slate-800">{quiz.durationMinutes || 15} Menit</strong>
          </div>

          <div className="flex items-center space-x-2">
            {onViewResults && (
              <button
                type="button"
                onClick={() => onViewResults(quiz)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                title="Buka Data Nilai & Responden"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Lihat Nilai</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(quiz)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                title="Buka Editor Kuis"
              >
                <Edit className="w-3.5 h-3.5 text-emerald-700" />
                <span>Edit Kuis</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Kembali
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
