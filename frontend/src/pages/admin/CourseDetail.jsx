import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, Edit3, Save, X,
  BookOpen, Eye, GraduationCap, RefreshCw, AlertTriangle, CheckCircle2,
  FolderPlus, FilePlus, Info,
} from 'lucide-react';
import { LessonEditor } from './LessonEditor';
import { JourneyPlayer } from '../../components/JourneyPlayer';
import { publishedCourseToLearnerTool } from './publishedCourseAdapter';
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

export const CourseDetail = ({ courseId, token, onBack, onCourseDeleted }) => {
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [lessonsBySection, setLessonsBySection] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [expandedSections, setExpandedSections] = useState(new Set());
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  // Preview mode: creator | learner
  const [previewMode, setPreviewMode] = useState('creator');

  // Inline add module state
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // Inline add lesson state { sectionId, title }
  const [addingLessonFor, setAddingLessonFor] = useState(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  // Inline rename
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  // Delete confirmations
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id }

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadCourseData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const [courseData, sectionsData, lessonsData] = await Promise.all([
        adminFetch(`/courses/${courseId}`, token),
        adminFetch(`/courses/${courseId}/sections`, token),
        adminFetch(`/courses/${courseId}/lessons`, token),
      ]);
      setCourse(courseData);
      setSections(sectionsData);

      // Group lessons by section
      const byS = {};
      sectionsData.forEach(s => { byS[s.id] = []; });
      lessonsData.forEach(l => {
        if (l.section_id && byS[l.section_id] !== undefined) {
          byS[l.section_id].push(l);
        }
      });
      // Sort lessons by sort_order
      Object.keys(byS).forEach(sid => {
        byS[sid].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      setLessonsBySection(byS);

      // Auto-expand first section and select first lesson if none selected
      if (sectionsData.length > 0 && expandedSections.size === 0) {
        setExpandedSections(new Set([sectionsData[0].id]));
      }
      if (!selectedLessonId && lessonsData.length > 0) {
        setSelectedLessonId(lessonsData[0].id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => { loadCourseData(); }, [loadCourseData]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(s => {
      const n = new Set(s);
      n.has(sectionId) ? n.delete(sectionId) : n.add(sectionId);
      return n;
    });
  };

  // ── Add Module ──
  const createModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const newSection = await adminFetch(`/courses/${courseId}/sections`, token, {
        method: 'POST',
        body: JSON.stringify({ title: newModuleTitle.trim() }),
      });
      setSections(prev => [...prev, newSection]);
      setLessonsBySection(prev => ({ ...prev, [newSection.id]: [] }));
      setExpandedSections(s => new Set(s).add(newSection.id));
      setAddingModule(false);
      setNewModuleTitle('');
      showSuccess('Module added');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Delete Module ──
  const deleteSection = async (sectionId) => {
    try {
      await adminFetch(`/sections/${sectionId}`, token, { method: 'DELETE' });
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setLessonsBySection(prev => {
        const n = { ...prev };
        delete n[sectionId];
        return n;
      });
      // If selected lesson was in this section, clear it
      if (selectedLessonId) {
        const wasInDeleted = Object.entries(lessonsBySection[sectionId] || []).some(
          ([, l]) => l.id === selectedLessonId
        );
        if (wasInDeleted) setSelectedLessonId(null);
      }
      setConfirmDelete(null);
      showSuccess('Module deleted');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Rename Module ──
  const startEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };

  const saveEditSection = async (sectionId) => {
    try {
      await adminFetch(`/sections/${sectionId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ title: editingSectionTitle }),
      });
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title: editingSectionTitle } : s));
      setEditingSectionId(null);
      showSuccess('Module renamed');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Add Lesson ──
  const createLesson = async (sectionId) => {
    if (!newLessonTitle.trim()) return;
    try {
      const newLesson = await adminFetch(`/sections/${sectionId}/lessons`, token, {
        method: 'POST',
        body: JSON.stringify({ title: newLessonTitle.trim() }),
      });
      setLessonsBySection(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), newLesson],
      }));
      setAddingLessonFor(null);
      setNewLessonTitle('');
      setSelectedLessonId(newLesson.id);
      showSuccess('Lesson added — use AI Actions to generate content');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Lesson handlers ──
  const handleLessonUpdated = () => {
    // Refresh lesson list to pick up new titles/status
    loadCourseData();
  };

  const handleLessonDeleted = (lessonId) => {
    setLessonsBySection(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(sid => {
        n[sid] = n[sid].filter(l => l.id !== lessonId);
      });
      return n;
    });
    if (selectedLessonId === lessonId) setSelectedLessonId(null);
    showSuccess('Lesson deleted');
  };

  // ── Delete course ──
  const deleteCourse = async () => {
    try {
      await adminFetch(`/courses/${courseId}`, token, { method: 'DELETE' });
      onCourseDeleted?.();
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Learner preview data (fetch the public course API with nested sections) ──
  const [learnerCourse, setLearnerCourse] = useState(null);
  const loadLearnerPreview = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/content/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setLearnerCourse(data);
      }
    } catch {/* ignore */}
  }, [courseId]);

  useEffect(() => {
    if (previewMode === 'learner') {
      loadLearnerPreview();
    }
  }, [previewMode, loadLearnerPreview]);

  const learnerData = useMemo(() => {
    if (!learnerCourse) return null;
    return publishedCourseToLearnerTool(learnerCourse);
  }, [learnerCourse]);

  if (loading && !course) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading course...
      </div>
    );
  }

  if (!course) {
    return <div className="text-center text-slate-400 py-12">Course not found</div>;
  }

  const totalLessons = Object.values(lessonsBySection).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
            title="Back to course list"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{course.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {course.category_id} · {sections.length} modules · {totalLessons} lessons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Preview mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('creator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                previewMode === 'creator'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Creator
            </button>
            <button
              onClick={() => setPreviewMode('learner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                previewMode === 'learner'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Learner
            </button>
          </div>

          {/* Delete course */}
          {confirmDelete?.type === 'course' ? (
            <div className="flex items-center gap-1">
              <button onClick={deleteCourse} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete({ type: 'course', id: courseId })}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              title="Delete course"
            >
              <Trash2 className="w-4 h-4" />
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

      {/* Learner preview mode */}
      {previewMode === 'learner' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-800 font-medium">
              Learner preview — progress and XP are not saved
            </span>
          </div>
          {learnerData ? (
            <div className="min-h-[600px]">
              <JourneyPlayer
                tool={learnerData.tool}
                modules={learnerData.modules}
                isModuleCompleted={learnerData.isModuleCompleted}
                isModuleUnlocked={learnerData.isModuleUnlocked}
                getModuleProgress={learnerData.getModuleProgress}
                completeModule={learnerData.completeModule}
                initialModuleId={null}
                previewVideoUrl=""
                previewMode
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading learner preview...
            </div>
          )}
        </div>
      )}

      {/* Creator mode: sidebar + main editor */}
      {previewMode === 'creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Sidebar: Modules tree */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modules</h3>
            </div>

            {sections.length === 0 && !addingModule && (
              <p className="text-xs text-slate-400 text-center py-4">
                No modules yet. Click below to add one.
              </p>
            )}

            {sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const lessons = lessonsBySection[section.id] || [];
              return (
                <div key={section.id} className="rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1 hover:bg-slate-50 rounded-lg px-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-1 flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {editingSectionId === section.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditSection(section.id)}
                          autoFocus
                          className="flex-1 text-sm border border-primary rounded px-1.5 py-0.5 focus:outline-none"
                        />
                        <button onClick={() => saveEditSection(section.id)} className="text-emerald-600 p-0.5">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingSectionId(null)} className="text-slate-400 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex-1 text-left py-1.5 text-sm font-semibold text-slate-800 truncate"
                        >
                          {section.title}
                        </button>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {lessons.length}
                        </span>
                        <button
                          onClick={() => startEditSection(section)}
                          className="p-1 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100"
                          title="Rename module"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {confirmDelete?.type === 'section' && confirmDelete?.id === section.id ? (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => deleteSection(section.id)} className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">
                              Del
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-slate-400 px-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete({ type: 'section', id: section.id })}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Delete module"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Lessons list */}
                  {isExpanded && (
                    <div className="ml-5 space-y-0.5 pb-1">
                      {lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                            selectedLessonId === lesson.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <BookOpen className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.status === 'draft' && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">draft</span>
                          )}
                        </button>
                      ))}

                      {/* Add lesson */}
                      {addingLessonFor === section.id ? (
                        <div className="flex items-center gap-1 px-1 py-1">
                          <input
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createLesson(section.id)}
                            placeholder="New lesson title..."
                            autoFocus
                            className="flex-1 text-xs border border-primary rounded px-1.5 py-1 focus:outline-none"
                          />
                          <button onClick={() => createLesson(section.id)} className="text-emerald-600 p-0.5">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setAddingLessonFor(null); setNewLessonTitle(''); }} className="text-slate-400 p-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingLessonFor(section.id)}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-primary hover:bg-primary/5"
                        >
                          <FilePlus className="w-3 h-3" />
                          Add lesson
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Module */}
            {addingModule ? (
              <div className="flex items-center gap-1 px-1 py-1 border-t border-slate-100 pt-2 mt-2">
                <input
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createModule()}
                  placeholder="New module title..."
                  autoFocus
                  className="flex-1 text-sm border border-primary rounded px-2 py-1 focus:outline-none"
                />
                <button onClick={createModule} className="text-emerald-600 p-1">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingModule(false); setNewModuleTitle(''); }} className="text-slate-400 p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingModule(true)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-500 hover:text-primary hover:bg-primary/5 border-t border-slate-100 mt-2 pt-3"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Add Module
              </button>
            )}
          </div>

          {/* Main: Lesson editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {selectedLessonId ? (
              <LessonEditor
                key={selectedLessonId}
                lessonId={selectedLessonId}
                token={token}
                onLessonUpdated={handleLessonUpdated}
                onLessonDeleted={handleLessonDeleted}
              />
            ) : (
              <div className="text-center text-slate-400 py-16">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Select a lesson to edit its content.</p>
                <p className="text-xs mt-1">Or add a new module/lesson from the sidebar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
