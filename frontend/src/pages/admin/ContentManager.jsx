import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Pencil } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { CourseList } from './CourseList';
import { CourseDetail } from './CourseDetail';
import { CourseCreatorTab } from './CourseCreatorTab';
import { ManualCourseConfig } from './ManualCourseConfig';

/**
 * ContentManager orchestrates five sub-views for admin course management:
 *  - 'list':          CourseList (default) — search, filter, select a course, or click "New Course"
 *  - 'detail':        CourseDetail — view/edit one course (modules, lessons, learner preview)
 *  - 'choose':        Picker — for AI-enabled users to choose AI vs manual creation
 *  - 'creator':       CourseCreatorTab — AI-powered course creation wizard
 *  - 'manual-config': ManualCourseConfig — manual course creation wizard
 */
export const ContentManager = ({ token }) => {
  const { user, isAdmin, refreshUser } = useAuth();
  const canUseAI = !!user?.aiGenerationEnabled;

  const [view, setView] = useState('list'); // 'list' | 'detail' | 'choose' | 'creator' | 'manual-config'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  // Used to force-remount CourseList (refresh) after publish/delete
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // Refresh user data on mount to get latest aiGenerationEnabled status
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const goToList = () => {
    setView('list');
    setSelectedCourseId(null);
    setListRefreshKey(k => k + 1);
  };

  const goToDetail = (courseId) => {
    setSelectedCourseId(courseId);
    setView('detail');
  };

  const goToCreator = () => {
    // AI-enabled users get to choose; others go straight to manual
    setView(canUseAI ? 'choose' : 'manual-config');
  };

  const handleManualCourseCreated = (courseId) => {
    setSelectedCourseId(courseId);
    setView('detail');
  };

  const handleNavigateToDraft = (draftSlug) => {
    setSelectedCourseId(draftSlug);
    // Keep view as 'detail' but change to the draft course
  };

  if (view === 'detail' && selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        token={token}
        onBack={goToList}
        onCourseDeleted={goToList}
        onNavigateToDraft={handleNavigateToDraft}
      />
    );
  }

  if (view === 'choose') {
    return (
      <div className="space-y-4">
        <button
          onClick={goToList}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>

        <div className="max-w-3xl mx-auto py-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Create a new course</h2>
            <p className="text-sm text-slate-500 mt-1">Choose how you'd like to build your course.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setView('creator')}
              className="text-left bg-white border-2 border-slate-200 hover:border-primary hover:shadow-md rounded-xl p-6 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Create with AI</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Describe what you want and let AI draft a structured course with modules, lessons, and quizzes.
                You can review and edit everything before publishing.
              </p>
              <p className="text-xs text-primary font-medium mt-3 group-hover:underline">
                Start with AI →
              </p>
            </button>

            <button
              onClick={() => setView('manual-config')}
              className="text-left bg-white border-2 border-slate-200 hover:border-primary hover:shadow-md rounded-xl p-6 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Create manually</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Build your course from scratch — define the structure, write lessons, and add quizzes yourself.
                Full control over every detail.
              </p>
              <p className="text-xs text-primary font-medium mt-3 group-hover:underline">
                Start manually →
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'creator') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView(canUseAI ? 'choose' : 'list')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {canUseAI ? 'Back to options' : 'Back to Courses'}
        </button>
        <CourseCreatorTab token={token} onPublishSuccess={goToList} />
      </div>
    );
  }

  if (view === 'manual-config') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView(canUseAI ? 'choose' : 'list')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {canUseAI ? 'Back to options' : 'Back to Courses'}
        </button>
        <ManualCourseConfig
          token={token}
          onCancel={() => setView(canUseAI ? 'choose' : 'list')}
          onCreated={handleManualCourseCreated}
        />
      </div>
    );
  }

  // Default: list view
  return (
    <CourseList
      key={listRefreshKey}
      token={token}
      onSelectCourse={goToDetail}
      onNewCourse={goToCreator}
    />
  );
};
