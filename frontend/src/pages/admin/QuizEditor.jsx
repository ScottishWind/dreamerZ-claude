import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, Pencil, X, CheckCircle2,
  Image as ImageIcon, Upload, ChevronUp, ChevronDown, AlertTriangle,
  ListChecks, ToggleLeft, AlignLeft, CircleDot,
} from 'lucide-react';
import { formatErrorDetail } from '../../lib/utils';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const adminFetch = async (path, token, options = {}) => {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatErrorDetail(err.detail) || `Request failed (${res.status})`);
  }
  return res.json();
};

const adminUpload = async (path, token, formData) => {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatErrorDetail(err.detail) || `Request failed (${res.status})`);
  }
  return res.json();
};

// Question types catalogue
const TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: CircleDot, hint: 'One correct answer' },
  { value: 'multi-select', label: 'Multi-Select', icon: ListChecks, hint: 'Multiple correct answers' },
  { value: 'true-false', label: 'True / False', icon: ToggleLeft, hint: 'Boolean answer' },
  { value: 'short-answer', label: 'Descriptive', icon: AlignLeft, hint: 'Free-text answer' },
];

// Normalise a question loaded from backend / draft for the editor
const normaliseQuestion = (q, idx) => {
  // Map legacy "multiple-choice" → "mcq"
  let type = q.type || 'mcq';
  if (type === 'multiple-choice') type = 'mcq';

  const base = {
    id: q.id || `q-${Date.now()}-${idx}`,
    type,
    question: q.question || '',
    explanation: q.explanation || '',
    image_asset_id: q.image_asset_id || null,
    image_url: q.image_url || null,
  };

  if (type === 'mcq') {
    return {
      ...base,
      options: Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : (q.correct_index ?? 0),
    };
  }
  if (type === 'multi-select') {
    return {
      ...base,
      options: Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''],
      correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [],
    };
  }
  if (type === 'true-false') {
    return {
      ...base,
      correctAnswer: typeof q.correctAnswer === 'boolean' ? q.correctAnswer : true,
    };
  }
  // short-answer
  return {
    ...base,
    correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
  };
};

const blankQuestion = (type = 'mcq') => normaliseQuestion({ type }, Math.floor(Math.random() * 1e6));

const resolveImageUrl = (q) => {
  if (q.image_url) return q.image_url;
  if (q.image_asset_id) return `${API_BASE}/api/content/media/${q.image_asset_id}`;
  return null;
};

export const QuizEditor = ({
  lessonId,
  courseId,
  initialQuestions = [],
  passingScore = 70,
  token,
  onSaved,
  onError,
}) => {
  const [questions, setQuestions] = useState(() =>
    (initialQuestions || []).map((q, i) => normaliseQuestion(q, i)),
  );
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState(null); // editing buffer
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  const [pass, setPass] = useState(passingScore || 70);
  const imageFileInputRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Sync if parent reloads a different lesson / fresh data
  useEffect(() => {
    setQuestions((initialQuestions || []).map((q, i) => normaliseQuestion(q, i)));
    setEditingIdx(null);
    setDraft(null);
    setDirty(false);
    setPass(passingScore || 70);
    setConfirmDeleteIdx(null);
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setDraft({ ...questions[idx] });
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setDraft(null);
  };

  const updateDraft = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const switchType = (newType) => {
    if (!draft) return;
    const merged = normaliseQuestion(
      { ...draft, type: newType },
      Math.floor(Math.random() * 1e6),
    );
    // Preserve question / explanation / image fields on type switch
    setDraft({
      ...merged,
      id: draft.id,
      question: draft.question,
      explanation: draft.explanation,
      image_asset_id: draft.image_asset_id,
      image_url: draft.image_url,
    });
  };

  const setOption = (oIdx, value) => {
    const opts = [...(draft.options || [])];
    opts[oIdx] = value;
    updateDraft({ options: opts });
  };

  const addOption = () => {
    if ((draft.options || []).length >= 8) return;
    updateDraft({ options: [...(draft.options || []), ''] });
  };

  const removeOption = (oIdx) => {
    if ((draft.options || []).length <= 2) return;
    const opts = (draft.options || []).filter((_, i) => i !== oIdx);
    let patch = { options: opts };
    if (draft.type === 'mcq') {
      let next = draft.correctAnswer ?? 0;
      if (next === oIdx) next = 0;
      else if (next > oIdx) next = next - 1;
      patch.correctAnswer = next;
    } else if (draft.type === 'multi-select') {
      patch.correctAnswers = (draft.correctAnswers || [])
        .filter((i) => i !== oIdx)
        .map((i) => (i > oIdx ? i - 1 : i));
    }
    updateDraft(patch);
  };

  const toggleMultiCorrect = (oIdx) => {
    const set = new Set(draft.correctAnswers || []);
    if (set.has(oIdx)) set.delete(oIdx);
    else set.add(oIdx);
    updateDraft({ correctAnswers: Array.from(set).sort((a, b) => a - b) });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseId) formData.append('course_id', courseId);
      if (lessonId) formData.append('lesson_id', lessonId);
      formData.append('tags', 'quiz-question');
      const asset = await adminUpload('/media/upload', token, formData);
      updateDraft({
        image_asset_id: asset.id,
        image_url: `${API_BASE}/api/content/media/${asset.id}`,
      });
    } catch (e) {
      onError?.(e.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => updateDraft({ image_asset_id: null, image_url: null });

  // Validate a draft question before saving it back to the list
  const validateDraft = (d) => {
    if (!d.question || !d.question.trim()) return 'Question text is required.';
    if (d.type === 'mcq' || d.type === 'multi-select') {
      const opts = (d.options || []).map((o) => (o || '').trim());
      if (opts.length < 2) return 'Provide at least two options.';
      if (opts.some((o) => !o)) return 'All options must have text.';
      if (d.type === 'mcq' && (d.correctAnswer === undefined || d.correctAnswer === null)) {
        return 'Select the correct answer.';
      }
      if (d.type === 'multi-select' && (!d.correctAnswers || d.correctAnswers.length === 0)) {
        return 'Select at least one correct answer.';
      }
    }
    if (d.type === 'short-answer' && !(d.correctAnswer || '').trim()) {
      return 'Enter the expected answer.';
    }
    return null;
  };

  const commitEdit = () => {
    const err = validateDraft(draft);
    if (err) {
      onError?.(err);
      return;
    }
    setQuestions((prev) => {
      const next = [...prev];
      next[editingIdx] = draft;
      return next;
    });
    setEditingIdx(null);
    setDraft(null);
    setDirty(true);
  };

  const addQuestion = (type = 'mcq') => {
    const q = blankQuestion(type);
    setQuestions((prev) => [...prev, q]);
    setEditingIdx(questions.length);
    setDraft(q);
    setDirty(true);
  };

  const deleteQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setConfirmDeleteIdx(null);
    if (editingIdx === idx) cancelEdit();
    setDirty(true);
  };

  const moveQuestion = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    if (editingIdx === idx) setEditingIdx(target);
    else if (editingIdx === target) setEditingIdx(idx);
    setDirty(true);
  };

  const saveAll = async () => {
    if (editingIdx !== null) {
      onError?.('Finish editing the current question before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          explanation: q.explanation,
          image_asset_id: q.image_asset_id || null,
          image_url: q.image_url || null,
          options: q.type === 'mcq' || q.type === 'multi-select' ? q.options : undefined,
          correctAnswer:
            q.type === 'multi-select' ? undefined : q.correctAnswer,
          correctAnswers: q.type === 'multi-select' ? q.correctAnswers : undefined,
        })),
        passing_score: pass,
      };
      const saved = await adminFetch(`/lessons/${lessonId}/quiz`, token, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setDirty(false);
      onSaved?.(saved);
    } catch (e) {
      onError?.(e.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const totalQuestions = questions.length;
  const typeBadgeFor = (type) => TYPES.find((t) => t.value === type) || TYPES[0];

  // ── Render helpers ──
  const renderReadCard = (q, idx) => {
    const meta = typeBadgeFor(q.type);
    const Icon = meta.icon;
    const imgUrl = resolveImageUrl(q);
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Question {idx + 1}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Icon className="w-3 h-3" /> {meta.label}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-wrap">{q.question || <span className="italic text-slate-400">No question text</span>}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => moveQuestion(idx, -1)}
              disabled={idx === 0}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveQuestion(idx, 1)}
              disabled={idx === questions.length - 1}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => startEdit(idx)}
              className="p-1 text-slate-400 hover:text-primary"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {confirmDeleteIdx === idx ? (
              <>
                <button
                  onClick={() => deleteQuestion(idx)}
                  className="text-[11px] font-medium px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeleteIdx(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDeleteIdx(idx)}
                className="p-1 text-slate-400 hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {imgUrl && (
          <img
            src={imgUrl}
            alt="Question"
            className="max-h-48 rounded-lg border border-slate-200 object-contain bg-slate-50"
          />
        )}

        {(q.type === 'mcq' || q.type === 'multi-select') && (
          <div className="space-y-1">
            {(q.options || []).map((opt, oIdx) => {
              const correct = q.type === 'mcq'
                ? oIdx === q.correctAnswer
                : (q.correctAnswers || []).includes(oIdx);
              return (
                <div
                  key={oIdx}
                  className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                    correct
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-mono w-5">{String.fromCharCode(65 + oIdx)}.</span>
                  <span className="flex-1">{opt}</span>
                  {correct && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'true-false' && (
          <div className="text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Correct answer: <strong>{q.correctAnswer ? 'True' : 'False'}</strong>
          </div>
        )}

        {q.type === 'short-answer' && (
          <div className="text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="font-semibold">Expected:</span>{' '}
            <span className="italic">{q.correctAnswer || '(empty)'}</span>
          </div>
        )}

        {q.explanation && (
          <p className="text-xs text-slate-500 italic">💡 {q.explanation}</p>
        )}
      </div>
    );
  };

  const renderEditForm = () => {
    if (!draft) return null;
    const imgUrl = resolveImageUrl(draft);
    return (
      <div className="bg-violet-50/30 border border-violet-200 rounded-lg p-4 space-y-3">
        {/* Type selector */}
        <div>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = draft.type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => switchType(t.value)}
                  className={`flex flex-col items-start gap-1 p-2 rounded-lg border text-left transition-colors ${
                    active
                      ? 'border-primary bg-white text-primary ring-1 ring-primary/30'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question text */}
        <label className="block">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Question</span>
          <textarea
            value={draft.question}
            onChange={(e) => updateDraft({ question: e.target.value })}
            rows={2}
            placeholder="Enter the question text…"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </label>

        {/* Image */}
        <div>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Question Image (optional)</span>
          <div className="mt-1 flex items-start gap-3">
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
                e.target.value = '';
              }}
            />
            {imgUrl ? (
              <div className="relative">
                <img src={imgUrl} alt="Question" className="max-h-32 rounded-lg border border-slate-200 object-contain bg-white" />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 text-slate-500 hover:text-red-500"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageFileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-3 py-2 text-xs border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                {uploadingImage ? 'Uploading…' : 'Add image'}
              </button>
            )}
            {imgUrl && !uploadingImage && (
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-primary"
              >
                <Upload className="w-3.5 h-3.5" /> Replace
              </button>
            )}
          </div>
        </div>

        {/* Type-specific fields */}
        {(draft.type === 'mcq' || draft.type === 'multi-select') && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Options {draft.type === 'mcq' ? '(select one correct)' : '(select all correct)'}
              </span>
              <button
                onClick={addOption}
                disabled={(draft.options || []).length >= 8}
                className="text-xs text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <div className="space-y-2 mt-1">
              {(draft.options || []).map((opt, oIdx) => {
                const isCorrect = draft.type === 'mcq'
                  ? draft.correctAnswer === oIdx
                  : (draft.correctAnswers || []).includes(oIdx);
                return (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        draft.type === 'mcq'
                          ? updateDraft({ correctAnswer: oIdx })
                          : toggleMultiCorrect(oIdx)
                      }
                      className={`flex-shrink-0 w-6 h-6 rounded ${
                        draft.type === 'multi-select' ? 'rounded-md' : 'rounded-full'
                      } border-2 flex items-center justify-center text-xs ${
                        isCorrect
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-300 hover:border-emerald-400'
                      }`}
                      title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                    >
                      {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-mono w-5 text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                    <input
                      value={opt}
                      onChange={(e) => setOption(oIdx, e.target.value)}
                      placeholder={`Option ${oIdx + 1}`}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => removeOption(oIdx)}
                      disabled={(draft.options || []).length <= 2}
                      className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {draft.type === 'true-false' && (
          <div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Correct Answer</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => updateDraft({ correctAnswer: val })}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium ${
                    draft.correctAnswer === val
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {val ? '✓ True' : '✗ False'}
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.type === 'short-answer' && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Expected Answer</span>
            <input
              value={draft.correctAnswer || ''}
              onChange={(e) => updateDraft({ correctAnswer: e.target.value })}
              placeholder="The expected answer (keyword matching is used)"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Learner answers are matched against this expected answer using keyword/contains matching.
            </p>
          </label>
        )}

        {/* Explanation */}
        <label className="block">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Explanation (optional)</span>
          <textarea
            value={draft.explanation || ''}
            onChange={(e) => updateDraft({ explanation: e.target.value })}
            rows={2}
            placeholder="Shown to the learner after they answer"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={cancelEdit}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={commitEdit}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Apply
          </button>
        </div>
      </div>
    );
  };

  const addMenu = useMemo(() => TYPES, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="font-medium">{totalQuestions}</span> question{totalQuestions === 1 ? '' : 's'}
          {dirty && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Unsaved changes
            </span>
          )}
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Pass %
            <input
              type="number"
              min={1}
              max={100}
              value={pass}
              onChange={(e) => {
                setPass(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 70)));
                setDirty(true);
              }}
              className="w-16 border border-slate-200 rounded px-2 py-0.5 text-xs"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen((o) => !o)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
              <ChevronDown className="w-3 h-3" />
            </button>
            {addMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                  {addMenu.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          addQuestion(t.value);
                          setAddMenuOpen(false);
                        }}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        <Icon className="w-3.5 h-3.5 mt-0.5 text-primary" />
                        <span>
                          <div className="font-semibold text-slate-700">{t.label}</div>
                          <div className="text-[10px] text-slate-400">{t.hint}</div>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={saveAll}
            disabled={saving || editingIdx !== null}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
            title={editingIdx !== null ? 'Apply or cancel the open question first' : 'Save quiz'}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Quiz
          </button>
        </div>
      </div>

      {/* List */}
      {totalQuestions === 0 && editingIdx === null ? (
        <div className="text-center text-slate-500 py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <HelpEmpty />
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} id={`quiz-q-${idx}`}>
              {editingIdx === idx ? renderEditForm() : renderReadCard(q, idx)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HelpEmpty = () => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-slate-600">No quiz questions yet.</p>
    <p className="text-xs text-slate-400">
      Click <strong>Add Question</strong> above to create one — choose between multiple choice,
      multi-select, true/false, or descriptive answer types. You can attach an image to any question.
    </p>
  </div>
);

export default QuizEditor;
