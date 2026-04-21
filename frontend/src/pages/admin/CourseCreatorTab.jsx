import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw,
  FileText, Play, ChevronDown, ChevronUp, Edit3, Save, X, ArrowRight
} from 'lucide-react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const TONES = [
  { value: 'academic', label: 'Academic' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
];

const adminJson = async (path, token, options = {}) => {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
};

const adminUpload = async (path, token, formData) => {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json();
};

// ── Sub-components ────────────────────────────────────────

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { id: 'upload', label: 'Upload' },
    { id: 'config', label: 'Configure' },
    { id: 'blueprint', label: 'Blueprint' },
    { id: 'lessons', label: 'Generate' },
    { id: 'preview', label: 'Preview' },
    { id: 'published', label: 'Publish' },
  ];
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
            </div>
            <span className={`text-xs ${isActive ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
              {step.label}
            </span>
            {idx < steps.length - 1 && <div className="w-4 h-px bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
};

const ValidationBadge = ({ validation }) => {
  if (!validation) return null;
  if (validation.is_valid && (validation.issues || []).length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Validated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> {(validation.issues || []).length} issue(s)
    </span>
  );
};

// ── Main component ───────────────────────────────────────
export const CourseCreatorTab = ({ token }) => {
  const [step, setStep] = useState('upload');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  // Parsed doc
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);

  // Config
  const [tone, setTone] = useState('professional');
  const [moduleCount, setModuleCount] = useState(6);
  const [lessonsPerModule, setLessonsPerModule] = useState(3);
  const [courseTitleHint, setCourseTitleHint] = useState('');
  const [instructions, setInstructions] = useState('');

  // Draft
  const [draft, setDraft] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);
  const [generatingLessonId, setGeneratingLessonId] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({});

  const fileInputRef = useRef(null);

  const resetFlow = () => {
    setStep('upload');
    setError('');
    setSuccess('');
    setFile(null);
    setParsed(null);
    setDraft(null);
    setCourseTitleHint('');
    setInstructions('');
    setExpandedModule(null);
    setProgress({ done: 0, total: 0 });
  };

  // ── Upload & parse ──
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const result = await adminUpload('/admin/course-gen/parse', token, formData);
      setParsed(result);
      setStep('config');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token]);

  // ── Blueprint ──
  const handleGenerateBlueprint = async () => {
    if (!parsed) return;
    setBusy(true);
    setError('');
    setStep('blueprint');
    try {
      const result = await adminJson('/admin/course-gen/blueprint', token, {
        method: 'POST',
        body: JSON.stringify({
          source_text: parsed.raw_text,
          filename: file?.name || 'upload',
          tone,
          module_count: moduleCount,
          lessons_per_module: lessonsPerModule,
          course_title_hint: courseTitleHint || undefined,
          instructions: instructions || undefined,
        }),
      });
      setDraft(result);
      setSuccess('Blueprint generated. Review the outline and generate lessons.');
    } catch (e) {
      setError(e.message);
      setStep('config');
    } finally {
      setBusy(false);
    }
  };

  // ── Generate single lesson ──
  const generateLesson = async (moduleId, lessonId) => {
    setGeneratingLessonId(lessonId);
    setError('');
    try {
      const result = await adminJson(
        `/admin/course-gen/drafts/${draft.id}/lesson`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            module_id: moduleId,
            lesson_id: lessonId,
            run_critique: true,
          }),
        },
      );

      // Merge content into local draft state
      setDraft((d) => {
        if (!d) return d;
        const updated = { ...d, blueprint: { ...d.blueprint } };
        updated.blueprint.modules = updated.blueprint.modules.map((m) => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, content: result.content, validation: result.validation, status: 'generated' }
                : l,
            ),
          };
        });
        return updated;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingLessonId(null);
    }
  };

  // ── Generate all lessons sequentially ──
  const generateAllLessons = async () => {
    if (!draft) return;
    setStep('lessons');
    setError('');

    const toGenerate = [];
    draft.blueprint.modules.forEach((m) =>
      m.lessons.forEach((l) => {
        if (l.status !== 'generated') toGenerate.push({ moduleId: m.id, lessonId: l.id });
      }),
    );
    setProgress({ done: 0, total: toGenerate.length });

    for (const { moduleId, lessonId } of toGenerate) {
      await generateLesson(moduleId, lessonId);
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setStep('preview');
    setSuccess('All lessons generated. Preview and publish when ready.');
  };

  // ── Edit lesson content inline ──
  const startEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setEditBuffer({
      title: lesson.title,
      explanation: lesson.content?.explanation || '',
      example: lesson.content?.example || '',
      activity: lesson.content?.activity || '',
    });
  };

  const saveLessonEdit = async (moduleId, lessonId) => {
    if (!draft) return;
    const updatedBlueprint = { ...draft.blueprint };
    updatedBlueprint.modules = updatedBlueprint.modules.map((m) => {
      if (m.id !== moduleId) return m;
      return {
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === lessonId
            ? {
                ...l,
                title: editBuffer.title,
                content: {
                  ...(l.content || {}),
                  explanation: editBuffer.explanation,
                  example: editBuffer.example,
                  activity: editBuffer.activity,
                },
              }
            : l,
        ),
      };
    });

    try {
      await adminJson(`/admin/course-gen/drafts/${draft.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ blueprint: updatedBlueprint }),
      });
      setDraft({ ...draft, blueprint: updatedBlueprint });
      setEditingLessonId(null);
      setSuccess('Lesson saved.');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Publish ──
  const handlePublish = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminJson(
        `/admin/course-gen/drafts/${draft.id}/publish`,
        token,
        { method: 'POST' },
      );
      setSuccess(
        `Course published! Created ${result.lessons} lessons and ${result.assessments} quizzes.`,
      );
      setStep('published');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-4">
      <StepIndicator currentStep={step} />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg">
          {success}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900">AI Course Creator</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Upload a PDF, DOCX or text file. Claude will turn it into a full course blueprint
            with modules, lessons and quizzes. Review and edit before publishing.
          </p>
          <div
            onClick={() => !busy && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-slate-50 transition-colors ${busy ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            {busy ? (
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {busy ? 'Parsing document…' : 'Drop PDF / DOCX / TXT or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Claude reads the text and extracts headings automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 2: Configure ── */}
      {step === 'config' && parsed && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700 text-sm">{file?.name}</span>
              <span className="text-xs text-slate-400">
                · {parsed.char_count?.toLocaleString()} chars
                {parsed.page_count ? ` · ${parsed.page_count} pages` : ''}
              </span>
            </div>
            <details className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 max-h-40 overflow-auto">
              <summary className="cursor-pointer font-medium">Preview parsed text</summary>
              <pre className="whitespace-pre-wrap mt-2">{parsed.raw_text?.slice(0, 2000)}…</pre>
            </details>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Modules</span>
              <input
                type="number"
                min={2}
                max={12}
                value={moduleCount}
                onChange={(e) => setModuleCount(parseInt(e.target.value, 10) || 6)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Lessons per module</span>
              <input
                type="number"
                min={2}
                max={8}
                value={lessonsPerModule}
                onChange={(e) => setLessonsPerModule(parseInt(e.target.value, 10) || 3)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Course title (optional)</span>
              <input
                value={courseTitleHint}
                onChange={(e) => setCourseTitleHint(e.target.value)}
                placeholder="Leave blank to let AI decide"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Special instructions</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. focus on practical examples, target age 14-18, include Indian context"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={resetFlow}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
            >
              ← Re-upload
            </button>
            <button
              onClick={handleGenerateBlueprint}
              disabled={busy}
              className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Blueprint
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3+: Blueprint / Lessons / Preview ── */}
      {(step === 'blueprint' || step === 'lessons' || step === 'preview') && (
        <>
          {busy && !draft && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Claude is reading the document and designing your course…
              </p>
            </div>
          )}

          {draft && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {draft.blueprint.course_title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {draft.blueprint.course_description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>Difficulty: {draft.blueprint.difficulty || 'beginner'}</span>
                      <span>·</span>
                      <span>{draft.blueprint.modules?.length || 0} modules</span>
                      <span>·</span>
                      <span>
                        {draft.blueprint.modules?.reduce(
                          (sum, m) => sum + (m.lessons?.length || 0), 0,
                        )}{' '}
                        lessons
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step !== 'preview' && (
                      <button
                        onClick={generateAllLessons}
                        disabled={busy || generatingLessonId}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" /> Generate All Lessons
                      </button>
                    )}
                    {step === 'preview' && (
                      <button
                        onClick={handlePublish}
                        disabled={busy}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Publish Course
                      </button>
                    )}
                  </div>
                </div>

                {progress.total > 0 && progress.done < progress.total && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>
                        Generating lesson {progress.done + 1} of {progress.total}…
                      </span>
                      <span>{Math.round((progress.done / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 transition-all"
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modules / lessons tree */}
              <div className="space-y-2">
                {draft.blueprint.modules?.map((module, mIdx) => {
                  const open = expandedModule === module.id;
                  return (
                    <div key={module.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setExpandedModule(open ? null : module.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50"
                      >
                        {open ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 text-sm">
                            Module {mIdx + 1}: {module.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {module.lessons?.length || 0} lessons · {module.description}
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-slate-100"
                          >
                            <div className="divide-y divide-slate-50">
                              {module.lessons?.map((lesson, lIdx) => {
                                const isEditing = editingLessonId === lesson.id;
                                const isGenerating = generatingLessonId === lesson.id;
                                return (
                                  <div key={lesson.id} className="px-4 py-3 text-sm">
                                    <div className="flex items-start gap-3">
                                      <span className="text-xs text-slate-400 mt-0.5 flex-shrink-0">
                                        {mIdx + 1}.{lIdx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                          <input
                                            value={editBuffer.title}
                                            onChange={(e) => setEditBuffer((b) => ({ ...b, title: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm font-medium"
                                          />
                                        ) : (
                                          <div className="font-medium text-slate-800">
                                            {lesson.title}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                                          <span>{lesson.minutes || 10} min</span>
                                          {lesson.status === 'generated' ? (
                                            <span className="text-emerald-600 font-medium">
                                              ✓ Generated
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">Pending</span>
                                          )}
                                          <ValidationBadge validation={lesson.validation} />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {lesson.status !== 'generated' && !isGenerating && (
                                          <button
                                            onClick={() => generateLesson(module.id, lesson.id)}
                                            className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1"
                                          >
                                            <Sparkles className="w-3 h-3" />
                                            Generate
                                          </button>
                                        )}
                                        {isGenerating && (
                                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                                        )}
                                        {lesson.status === 'generated' && !isEditing && (
                                          <button
                                            onClick={() => startEditLesson(lesson)}
                                            className="p-1 text-slate-400 hover:text-primary"
                                            title="Edit"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        )}
                                        {isEditing && (
                                          <>
                                            <button
                                              onClick={() => saveLessonEdit(module.id, lesson.id)}
                                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                            >
                                              <Save className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => setEditingLessonId(null)}
                                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Expanded lesson content */}
                                    {(lesson.status === 'generated' || isEditing) && (
                                      <div className="mt-3 ml-6 space-y-3 bg-slate-50 rounded-lg p-3">
                                        <div>
                                          <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">Explanation</div>
                                          {isEditing ? (
                                            <textarea
                                              value={editBuffer.explanation}
                                              onChange={(e) => setEditBuffer((b) => ({ ...b, explanation: e.target.value }))}
                                              rows={8}
                                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                                            />
                                          ) : (
                                            <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                              {lesson.content?.explanation}
                                            </div>
                                          )}
                                        </div>

                                        {(lesson.content?.example || isEditing) && (
                                          <div>
                                            <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">Example</div>
                                            {isEditing ? (
                                              <textarea
                                                value={editBuffer.example}
                                                onChange={(e) => setEditBuffer((b) => ({ ...b, example: e.target.value }))}
                                                rows={3}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                                              />
                                            ) : (
                                              <div className="text-xs text-slate-600 whitespace-pre-wrap">
                                                {lesson.content?.example}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {(lesson.content?.activity || isEditing) && (
                                          <div>
                                            <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">Activity</div>
                                            {isEditing ? (
                                              <textarea
                                                value={editBuffer.activity}
                                                onChange={(e) => setEditBuffer((b) => ({ ...b, activity: e.target.value }))}
                                                rows={2}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                                              />
                                            ) : (
                                              <div className="text-xs text-slate-600 whitespace-pre-wrap">
                                                {lesson.content?.activity}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {lesson.content?.quiz?.questions?.length > 0 && (
                                          <div>
                                            <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                                              Quiz ({lesson.content.quiz.questions.length})
                                            </div>
                                            <ul className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                                              {lesson.content.quiz.questions.slice(0, 3).map((q, qi) => (
                                                <li key={qi}>{q.question}</li>
                                              ))}
                                              {lesson.content.quiz.questions.length > 3 && (
                                                <li className="list-none text-slate-400">
                                                  … and {lesson.content.quiz.questions.length - 3} more
                                                </li>
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {lesson.validation && (lesson.validation.issues || []).length > 0 && (
                                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 mb-1">
                                              <AlertTriangle className="w-3 h-3" /> Validation issues
                                            </div>
                                            <ul className="text-xs text-amber-700 list-disc list-inside">
                                              {lesson.validation.issues.map((iss, i) => (
                                                <li key={i}>{iss}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Step 6: Published ── */}
      {step === 'published' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-emerald-900 mb-2">Course Published!</h2>
          <p className="text-emerald-700 text-sm mb-6">
            Your course is now live and available to all learners.
          </p>
          <button
            onClick={resetFlow}
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 hover:bg-primary/90"
          >
            <ArrowRight className="w-4 h-4" />
            Create Another Course
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseCreatorTab;
