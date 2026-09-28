import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Plus, Trash2, Copy, CheckCircle2, FileText, 
  Clock, Award, Link, HelpCircle, Save, ChevronUp, ChevronDown, 
  AlignLeft, CheckSquare, Settings, Sparkles, Layers, ShieldCheck, AlertCircle
} from 'lucide-react';

export default function GoogleFormQuizBuilder({ 
  initialQuiz, 
  onSaveQuiz, 
  onCancel, 
  currentUser 
}) {
  // Initialize state with existing quiz data or defaults
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [type, setType] = useState(initialQuiz?.type || 'pretest');
  const [durationMinutes, setDurationMinutes] = useState(initialQuiz?.durationMinutes || 15);
  const [passingGrade, setPassingGrade] = useState(initialQuiz?.passingGrade || 70);
  const [linkCode, setLinkCode] = useState(initialQuiz?.linkCode || `QUIZ-${Date.now().toString().slice(-4)}`);
  const [instructions, setInstructions] = useState(
    initialQuiz?.instructions || 
    "1) Pastikan koneksi internet stabil sebelum menekan tombol mulai.\n2) Dilarang menutup atau berpindah halaman selama kuis berlangsung.\n3) Bacalah setiap pertanyaan dengan cermat sebelum memilih opsi jawaban.\n4) Setelah menekan Submit, nilai Anda akan langsung disimpan & dikunci."
  );

  const [questions, setQuestions] = useState(
    initialQuiz?.questions && initialQuiz.questions.length > 0
      ? initialQuiz.questions.map(q => ({
          ...q,
          options: q.options ? [...q.options] : ['A. Opsi A', 'B. Opsi B', 'C. Opsi C', 'D. Opsi D']
        }))
      : [
          {
            id: `Q-${Date.now().toString().slice(-3)}-1`,
            type: 'multiple_choice',
            text: 'Tuliskan pertanyaan pilihan ganda pertama Anda di sini...',
            options: ['A. Opsi Jawaban 1', 'B. Opsi Jawaban 2', 'C. Opsi Jawaban 3', 'D. Opsi Jawaban 4'],
            correctAnswer: 'A. Opsi Jawaban 1',
            scoreWeight: 50,
            required: true
          },
          {
            id: `Q-${Date.now().toString().slice(-3)}-2`,
            type: 'essay',
            text: 'Jelaskan pemahaman Anda mengenai topik pembahasan sesi pelatihan ini secara rinci!',
            correctAnswer: 'Kunci acuan: Jawaban harus memuat poin utama konsep REST API dan database.',
            scoreWeight: 50,
            required: true
          }
        ]
  );

  const [activeQuestionId, setActiveQuestionId] = useState(questions[0]?.id || null);
  const [showSettingsAccordion, setShowSettingsAccordion] = useState(false);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Calculate total score
  const totalScorePoints = questions.reduce((sum, q) => sum + (parseInt(q.scoreWeight, 10) || 0), 0);

  // Handlers for Questions
  const handleAddQuestion = (qType = 'multiple_choice') => {
    const newId = `Q-${Date.now().toString().slice(-4)}`;
    const newQ = qType === 'multiple_choice'
      ? {
          id: newId,
          type: 'multiple_choice',
          text: '',
          options: ['A. Opsi Jawaban 1', 'B. Opsi Jawaban 2', 'C. Opsi Jawaban 3', 'D. Opsi Jawaban 4'],
          correctAnswer: 'A. Opsi Jawaban 1',
          scoreWeight: 25,
          required: true
        }
      : {
          id: newId,
          type: 'essay',
          text: '',
          correctAnswer: 'Kunci acuan jawaban essay...',
          scoreWeight: 25,
          required: true
        };

    setQuestions([...questions, newQ]);
    setActiveQuestionId(newId);
    showToast(qType === 'multiple_choice' ? 'Soal Pilihan Ganda ditambahkan!' : 'Soal Essay ditambahkan!');
  };

  const handleUpdateQuestion = (id, fields) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...fields } : q));
  };

  const handleDeleteQuestion = (id) => {
    if (questions.length <= 1) {
      alert('Minimal harus ada 1 pertanyaan dalam Quiz!');
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
    showToast('Soal berhasil dihapus.');
  };

  const handleDuplicateQuestion = (qToDup) => {
    const newId = `Q-${Date.now().toString().slice(-4)}`;
    const dupObj = {
      ...qToDup,
      id: newId,
      text: `${qToDup.text} (Salinan)`,
      options: qToDup.options ? [...qToDup.options] : []
    };
    const index = questions.findIndex(q => q.id === qToDup.id);
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, dupObj);
    setQuestions(newQuestions);
    setActiveQuestionId(newId);
    showToast('Soal berhasil diduplikasi!');
  };

  const handleMoveQuestion = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;
    setQuestions(newQuestions);
  };

  // Option actions for Multiple Choice
  const handleOptionTextChange = (qId, optIdx, newText) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return;

    const prefix = String.fromCharCode(65 + optIdx) + '. ';
    const cleanContent = newText.replace(/^[A-Z]\.\s*/, '');
    const fullOptionStr = `${prefix}${cleanContent}`;

    const newOpts = [...q.options];
    const isWasCorrect = newOpts[optIdx] === q.correctAnswer;
    newOpts[optIdx] = fullOptionStr;

    handleUpdateQuestion(qId, {
      options: newOpts,
      correctAnswer: isWasCorrect ? fullOptionStr : (q.correctAnswer === newOpts[optIdx] ? fullOptionStr : q.correctAnswer)
    });
  };

  const handleAddOption = (qId) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return;
    const nextIdx = q.options.length;
    if (nextIdx >= 8) {
      alert('Maksimal 8 opsi jawaban per pertanyaan.');
      return;
    }
    const prefix = String.fromCharCode(65 + nextIdx) + '. ';
    const newOptStr = `${prefix}Opsi Jawaban ${nextIdx + 1}`;
    handleUpdateQuestion(qId, {
      options: [...q.options, newOptStr]
    });
  };

  const handleDeleteOption = (qId, optIdx) => {
    const q = questions.find(item => item.id === qId);
    if (!q || q.options.length <= 2) {
      alert('Minimal 2 opsi jawaban untuk soal Pilihan Ganda!');
      return;
    }
    const deletedOptVal = q.options[optIdx];
    const rawOpts = q.options.filter((_, idx) => idx !== optIdx);

    const reindexedOpts = rawOpts.map((optStr, idx) => {
      const prefix = String.fromCharCode(65 + idx) + '. ';
      const clean = optStr.replace(/^[A-Z]\.\s*/, '');
      return `${prefix}${clean}`;
    });

    let newCorrect = q.correctAnswer;
    if (deletedOptVal === q.correctAnswer) {
      newCorrect = reindexedOpts[0];
    } else {
      const oldIdx = q.options.indexOf(q.correctAnswer);
      if (oldIdx !== -1 && oldIdx > optIdx) {
        newCorrect = reindexedOpts[oldIdx - 1];
      }
    }

    handleUpdateQuestion(qId, {
      options: reindexedOpts,
      correctAnswer: newCorrect
    });
  };

  const handleSetCorrectAnswer = (qId, optStr) => {
    handleUpdateQuestion(qId, { correctAnswer: optStr });
  };

  // Submit Save Form
  const handleSubmitSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim()) {
      alert('Judul Quiz wajib diisi!');
      return;
    }

    const emptyQ = questions.find(q => !q.text.trim());
    if (emptyQ) {
      alert('Semua pertanyaan harus memiliki teks pertanyaan!');
      setActiveQuestionId(emptyQ.id);
      return;
    }

    const quizPayload = {
      id: initialQuiz?.id || `QZ-${Date.now().toString().slice(-3)}`,
      title: title.trim(),
      type: type,
      durationMinutes: parseInt(durationMinutes, 10) || 15,
      passingGrade: parseInt(passingGrade, 10) || 70,
      linkCode: linkCode.trim() || `QUIZ-${Date.now().toString().slice(-4)}`,
      status: initialQuiz?.status || 'Aktif',
      createdBy: initialQuiz?.createdBy || currentUser?.name || 'Siska Putri (Admin Panitia)',
      createdAt: initialQuiz?.createdAt || new Date().toLocaleDateString('id-ID'),
      description: description.trim() || 'Quiz evaluasi pelatihan.',
      instructions: instructions.trim(),
      questions: questions
    };

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    onSaveQuiz(quizPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xl flex items-center space-x-2 border border-slate-700 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* STICKY RESPONSIVE TOP NAVBAR (ALIGNED WITH PRESTREAM THEME) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between transition-all">
        <div className="flex items-center space-x-2 sm:space-x-3 truncate mr-2">
          <button
            onClick={onCancel}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            title="Kembali ke Daftar Quiz"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

          <div className="flex items-center space-x-2 truncate">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">{questions.length} Soal</span>
              </div>
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 leading-tight truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                {title || 'Quiz Tanpa Judul'}
              </h1>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="hidden lg:flex items-center space-x-2 mr-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
            <span>Total Skor:</span>
            <span className={`font-bold font-mono ${totalScorePoints === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {totalScorePoints} Poin
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer hidden sm:block"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmitSave}
            className="px-3.5 sm:px-5 py-2 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* MAIN GOOGLE FORMS RESPONSIVE CONTAINER */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* CARD 1: GOOGLE FORM HEADER CARD (PRESTREAM SIGNATURE EMERALD GRADIENT BAR) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden relative transition-all hover:border-emerald-300">
          {/* Accent Header Line (Signature Emerald Theme Gradient) */}
          <div className="h-3.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 w-full" />
          
          <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
            {/* Quiz Title Input (Large Responsive Input) */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Judul Quiz Utama</label>
              <input
                type="text"
                placeholder="Judul Quiz (Contoh: Pre-Test Sesi 1: REST API & DB)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg sm:text-xl md:text-2xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-emerald-600 focus:bg-emerald-50/20 px-2 py-2 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Quiz Description Input */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Deskripsi & Petunjuk Singkat</label>
              <textarea
                rows={2}
                placeholder="Deskripsi singkat atau petunjuk umum quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs sm:text-sm text-slate-700 border-b border-slate-200 focus:border-emerald-600 focus:bg-emerald-50/20 px-2 py-1.5 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Quiz Key Parameters Summary Pills / Toggle Accordion */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-[11px] rounded-full border border-amber-300">
                  {type === 'pretest' ? 'Pre-Test' : type === 'posttest' ? 'Post-Test' : 'Evaluasi'}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-full flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{durationMinutes} Menit</span>
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold text-[11px] rounded-full flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Passing Grade: {passingGrade} Poin</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsAccordion(!showSettingsAccordion)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-emerald-200 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-700" />
                <span>{showSettingsAccordion ? 'Sembunyikan Setting' : 'Pengaturan Ujian'}</span>
                {showSettingsAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* EXPANDABLE PARAMETER SETTINGS */}
            {showSettingsAccordion && (
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs animate-fade-in">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan & Rule Ujian (Form Settings)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Quiz</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600"
                    >
                      <option value="pretest">Pre-Test (Awal)</option>
                      <option value="posttest">Post-Test (Akhir)</option>
                      <option value="evaluasi">Evaluasi Pelatihan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Passing Grade (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passingGrade}
                      onChange={(e) => setPassingGrade(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Link Akses Unik</label>
                    <input
                      type="text"
                      value={linkCode}
                      onChange={(e) => setLinkCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-medium text-slate-800 uppercase outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap justify-between items-center mb-1 gap-1">
                    <label className="font-semibold text-slate-700">Petunjuk & Aturan Khusus Ujian</label>
                    <button
                      type="button"
                      onClick={() => setInstructions("1) Pastikan koneksi internet stabil sebelum menekan tombol mulai.\n2) Dilarang menutup atau berpindah halaman selama kuis berlangsung.\n3) Bacalah setiap pertanyaan dengan cermat sebelum memilih opsi jawaban.\n4) Setelah menekan Submit, nilai Anda akan langsung disimpan & dikunci.")}
                      className="text-[10px] text-emerald-700 font-bold hover:underline"
                    >
                      Gunakan Template Default
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full p-3 bg-white rounded-xl border border-slate-300 text-slate-800 font-medium leading-relaxed outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Score Warning Banner if != 100 */}
        {totalScorePoints !== 100 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Total akumulasi bobot skor kuis saat ini adalah <strong>{totalScorePoints} Poin</strong>. Disarankan total skor akumulasi seluruh soal = <strong>100 Poin</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const equalWeight = Math.floor(100 / questions.length);
                setQuestions(questions.map((q, idx) => ({
                  ...q,
                  scoreWeight: idx === questions.length - 1 ? 100 - (equalWeight * (questions.length - 1)) : equalWeight
                })));
                showToast('Skor otomatis dibagi rata mencapai 100 Poin!');
              }}
              className="px-3.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl text-[11px] shrink-0 transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Bagi Rata (100 Poin)
            </button>
          </div>
        )}

        {/* QUESTION CARDS LIST (GOOGLE FORMS RESPONSIVE STACKED CARDS) */}
        <div className="space-y-4">
          {questions.map((q, index) => {
            const isActive = activeQuestionId === q.id;

            return (
              <div
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={`bg-white rounded-3xl border-2 transition-all shadow-xs relative overflow-hidden ${
                  isActive ? 'border-emerald-600 shadow-md ring-2 ring-emerald-100' : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <div className="absolute top-0 left-0 bottom-0 w-2 bg-emerald-600 rounded-l-3xl" />
                )}

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Card Header Row (Question Number, Type Selector, Score Weight) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">Pertanyaan {index + 1}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                        q.type === 'multiple_choice' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Tipe Soal Selector Dropdown */}
                      <div className="flex items-center space-x-1.5">
                        {q.type === 'multiple_choice' ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <AlignLeft className="w-4 h-4 text-amber-600" />}
                        <select
                          value={q.type}
                          onChange={(e) => handleUpdateQuestion(q.id, { 
                            type: e.target.value,
                            correctAnswer: e.target.value === 'multiple_choice' ? (q.options?.[0] || 'A. Opsi A') : 'Kunci jawaban acuan essay...'
                          })}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-600"
                        >
                          <option value="multiple_choice">Pilihan Ganda</option>
                          <option value="essay">Isian / Essay</option>
                        </select>
                      </div>

                      {/* Score Weight Input */}
                      <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-semibold text-[11px]">Skor:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.scoreWeight || 25}
                          onChange={(e) => handleUpdateQuestion(q.id, { scoreWeight: parseInt(e.target.value, 10) || 0 })}
                          className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 font-mono text-center outline-none focus:border-emerald-600 text-xs"
                        />
                        <span className="text-slate-500 font-semibold text-[11px]">Poin</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Text Area */}
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Tuliskan pertanyaan / soal di sini..."
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 p-3 rounded-2xl outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* CONTENT FOR MULTIPLE CHOICE */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-600 mb-1 gap-1">
                        <span>Opsi Jawaban (Pilih radio button untuk Kunci Jawaban Benar):</span>
                        <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          Kunci: {q.correctAnswer}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {q.options?.map((optStr, optIdx) => {
                          const isCorrect = q.correctAnswer === optStr;
                          const optPrefix = String.fromCharCode(65 + optIdx) + '. ';
                          const optContent = optStr.replace(/^[A-Z]\.\s*/, '');

                          return (
                            <div 
                              key={optIdx} 
                              className={`flex items-center space-x-2 p-2 rounded-2xl border transition-all ${
                                isCorrect ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-200' : 'bg-white border-slate-200'
                              }`}
                            >
                              {/* Radio Button for selecting correct answer */}
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={isCorrect}
                                onChange={() => handleSetCorrectAnswer(q.id, optStr)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 ml-1"
                                title="Set sebagai Kunci Jawaban Benar"
                              />

                              <span className="font-extrabold text-xs text-slate-700 font-mono shrink-0 w-6">
                                {optPrefix}
                              </span>

                              <input
                                type="text"
                                value={optContent}
                                onChange={(e) => handleOptionTextChange(q.id, optIdx, e.target.value)}
                                placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                className="flex-1 text-xs font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-emerald-600 outline-none px-1 py-1"
                              />

                              {isCorrect && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md shrink-0 flex items-center space-x-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Kunci Benar</span>
                                </span>
                              )}

                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(q.id, optIdx)}
                                  className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                  title="Hapus Opsi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Option Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddOption(q.id)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/90 transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tambah Opsi ({String.fromCharCode(65 + (q.options?.length || 0))})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CONTENT FOR ESSAY */}
                  {q.type === 'essay' && (
                    <div className="space-y-3 pt-1 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 italic font-mono text-[11px]">
                        [Pratinjau Peserta: Kotak Teks Jawaban Uraian / Essay Panjang]
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Kunci Jawaban / Panduan Penilaian Essay (Rubrik Administrator):
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Tuliskan acuan poin kunci jawaban essay di sini untuk panduan penilaian..."
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })}
                          className="w-full p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-amber-900 font-medium outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* CARD FOOTER TOOLBAR */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                        title="Pindah Urutan Ke Atas"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'down')}
                        disabled={index === questions.length - 1}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                        title="Pindah Urutan Ke Bawah"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                        title="Salin / Duplikasi Soal Ini"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline text-[11px]">Duplikasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Pertanyaan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="h-4 w-px bg-slate-200" />

                      {/* Required Toggle */}
                      <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
                        <span>Wajib</span>
                        <input
                          type="checkbox"
                          checked={q.required !== false}
                          onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* RESPONSIVE BOTTOM ADD QUESTION BAR */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Ingin menambah pertanyaan baru ke form?
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleAddQuestion('multiple_choice')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>+ Pilihan Ganda</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddQuestion('essay')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-700" />
              <span>+ Essay</span>
            </button>
          </div>
        </div>

        {/* BOTTOM FINAL SAVE BUTTON */}
        <div className="pt-4 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="button"
            onClick={handleSubmitSave}
            className="px-6 py-2.5 btn-emerald text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>

      </div>
    </div>
  );
}
