import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, HelpCircle, Sparkles, Paperclip, Save, RefreshCw,
  Upload, X, Plus, Trash2, AlertTriangle, CheckCircle2, Wand2,
} from 'lucide-react';
import { QuizEditor } from './QuizEditor';
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

const TABS = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'media', label: 'Media', icon: Paperclip },
  { id: 'ai', label: 'AI Actions', icon: Sparkles },
];

export const LessonEditor = ({ lessonId, token, onLessonUpdated, onLessonDeleted }) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('content');

  // Content edit state
  const [contentForm, setContentForm] = useState({
    title: '',
    estimated_minutes: 10,
    explanation: '',
    example: '',
    activity: '',
  });
  const [saving, setSaving] = useState(false);

  // Quiz edit state
  const [quizQuestions, setQuizQuestions] = useState([]);

  // AI regenerate state
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiFiles, setAiFiles] = useState([]);
  const [regenerating, setRegenerating] = useState(false);
  const aiFileInputRef = useRef(null);

  // Media state
  const [mediaAssets, setMediaAssets] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaFileInputRef = useRef(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch(`/lessons/${lessonId}`, token);
      setLesson(data);

      // Populate content form from English content
      const enContent = data.contents?.en || {};
      setContentForm({
        title: data.title || '',
        estimated_minutes: data.estimated_minutes || 10,
        explanation: enContent.explanation || '',
        example: enContent.example || '',
        activity: enContent.activity || '',
      });

      // Quiz
      setQuizQuestions(data.assessment?.questions || []);

      // Media
      setMediaAssets(data.media_assets || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lessonId, token]);

  useEffect(() => { loadLesson(); }, [loadLesson]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Content tab ──
  const saveContent = async () => {
    setSaving(true);
    setError('');
    try {
      // Save lesson metadata
      await adminFetch(`/lessons/${lessonId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          title: contentForm.title,
          estimated_minutes: contentForm.estimated_minutes,
        }),
      });

      // Save English content
      await adminFetch(`/lessons/${lessonId}/content/en`, token, {
        method: 'PUT',
        body: JSON.stringify({
          explanation: contentForm.explanation,
          example: contentForm.example,
          activity: contentForm.activity,
        }),
      });

      showSuccess('Lesson saved');
      onLessonUpdated?.(lessonId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── AI regenerate ──
  const handleAiFilesSelect = (files) => {
    const arr = Array.from(files || []);
    setAiFiles(prev => [...prev, ...arr]);
  };

  const removeAiFile = (name) => {
    setAiFiles(prev => prev.filter(f => f.name !== name));
  };

  const regenerateLesson = async () => {
    if (!aiInstructions.trim() && aiFiles.length === 0) {
      setError('Please provide instructions or upload at least one document.');
      return;
    }
    setRegenerating(true);
    setError('');
    try {
      if (aiFiles.length > 0) {
        // Use multipart endpoint
        const formData = new FormData();
        aiFiles.forEach(f => formData.append('files', f));
        formData.append('instructions', aiInstructions);
        await adminUpload(`/lessons/${lessonId}/regenerate-with-docs`, token, formData);
      } else {
        // Use JSON endpoint
        await adminFetch(`/lessons/${lessonId}/regenerate`, token, {
          method: 'POST',
          body: JSON.stringify({ instructions: aiInstructions }),
        });
      }
      showSuccess('Lesson regenerated successfully');
      setAiInstructions('');
      setAiFiles([]);
      await loadLesson();
      onLessonUpdated?.(lessonId);
    } catch (e) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  // ── Media ──
  const handleMediaUpload = async (files) => {
    if (!files || files.length === 0) return;
    setMediaUploading(true);
    setError('');
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lesson_id', lessonId);
        formData.append('course_id', lesson.course_id);
        const asset = await adminUpload('/media/upload', token, formData);
        await adminFetch(`/media/${asset.id}/attach`, token, {
          method: 'POST',
          body: JSON.stringify({ lesson_id: lessonId }),
        });
        setMediaAssets(prev => [...prev, asset]);
      } catch (e) {
        setError(e.message);
      }
    }
    setMediaUploading(false);
    showSuccess('Files uploaded');
  };

  const removeMedia = async (assetId) => {
    try {
      await adminFetch(`/media/${assetId}`, token, { method: 'DELETE' });
      setMediaAssets(prev => prev.filter(a => a.id !== assetId));
      showSuccess('File removed');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Delete lesson ──
  const deleteLesson = async () => {
    try {
      await adminFetch(`/lessons/${lessonId}`, token, { method: 'DELETE' });
      onLessonDeleted?.(lessonId);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading lesson...
      </div>
    );
  }

  if (!lesson) {
    return <div className="text-center text-slate-400 py-12">Lesson not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{lesson.title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {lesson.estimated_minutes}min · ID: {lessonId}
          </p>
        </div>
        <div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={deleteLesson} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Lesson
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              value={contentForm.title}
              onChange={(e) => setContentForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Minutes</span>
            <input
              type="number"
              value={contentForm.estimated_minutes}
              onChange={(e) => setContentForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value, 10) || 10 }))}
              className="mt-1 w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Explanation</span>
            <textarea
              value={contentForm.explanation}
              onChange={(e) => setContentForm(f => ({ ...f, explanation: e.target.value }))}
              rows={8}
              placeholder="Main teaching content..."
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Example</span>
            <textarea
              value={contentForm.example}
              onChange={(e) => setContentForm(f => ({ ...f, example: e.target.value }))}
              rows={5}
              placeholder="Real-world example..."
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Activity</span>
            <textarea
              value={contentForm.activity}
              onChange={(e) => setContentForm(f => ({ ...f, activity: e.target.value }))}
              rows={5}
              placeholder="Hands-on practice activity..."
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>

          <div className="flex justify-end pt-2">
            <button
              onClick={saveContent}
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Quiz tab */}
      {activeTab === 'quiz' && (
        <QuizEditor
          lessonId={lessonId}
          courseId={lesson.course_id}
          initialQuestions={quizQuestions}
          passingScore={lesson.assessment?.passing_score || 70}
          token={token}
          onSaved={(saved) => {
            setQuizQuestions(saved?.questions || []);
            setLesson((l) => (l ? { ...l, assessment: saved } : l));
            showSuccess('Quiz saved');
            onLessonUpdated?.(lessonId);
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* AI Actions tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-violet-50 to-primary/5 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-violet-600" />
              <h3 className="font-bold text-slate-900">Regenerate with AI</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Provide instructions and/or upload reference documents. Claude will regenerate the lesson content and quiz.
            </p>

            <label className="block mb-3">
              <span className="text-sm font-medium text-slate-700">Instructions</span>
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                rows={4}
                placeholder="e.g. Rewrite this lesson with more practical examples. Focus on use cases relevant to small businesses..."
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </label>

            <div className="mb-3">
              <label className="text-sm font-medium text-slate-700 block mb-2">Reference Documents (optional)</label>
              <div
                onClick={() => aiFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30"
              >
                <input
                  ref={aiFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => handleAiFilesSelect(e.target.files)}
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">Click to upload PDF / DOCX / TXT</p>
              </div>

              {aiFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {aiFiles.map(f => (
                    <div key={f.name} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 text-xs border border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-slate-400" />
                        {f.name}
                      </span>
                      <button onClick={() => removeAiFile(f.name)} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={regenerateLesson}
              disabled={regenerating || (!aiInstructions.trim() && aiFiles.length === 0)}
              className="w-full bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-700 disabled:opacity-50"
            >
              {regenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {regenerating ? 'Regenerating...' : 'Regenerate Lesson'}
            </button>
          </div>
        </div>
      )}

      {/* Media tab */}
      {activeTab === 'media' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900 text-sm">Attached Files</h3>
            <div>
              <input
                ref={mediaFileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.svg,.xlsx,.pptx"
                onChange={(e) => { handleMediaUpload(e.target.files); e.target.value = ''; }}
              />
              <button
                onClick={() => mediaFileInputRef.current?.click()}
                disabled={mediaUploading}
                className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 disabled:opacity-50"
              >
                {mediaUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload & Attach
              </button>
            </div>
          </div>

          {mediaAssets.length === 0 ? (
            <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-lg text-sm">
              No files attached to this lesson yet
            </div>
          ) : (
            <div className="space-y-2">
              {mediaAssets.map(asset => (
                <div key={asset.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  {asset.type === 'image' ? (
                    <img src={`${API_BASE}/api/content/media/${asset.id}`} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{asset.original_filename}</p>
                    <p className="text-xs text-slate-400">{asset.file_extension?.toUpperCase()}</p>
                  </div>
                  <button onClick={() => removeMedia(asset.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
