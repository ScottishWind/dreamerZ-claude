import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { CourseList } from './CourseList';
import { CourseDetail } from './CourseDetail';
import { CourseCreatorTab } from './CourseCreatorTab';
import { ManualCourseConfig } from './ManualCourseConfig';

/**
 * ContentManager orchestrates four sub-views for admin course management:
 *  - 'list':          CourseList (default) — search, filter, select a course, or click "New Course"
 *  - 'detail':        CourseDetail — view/edit one course (modules, lessons, learner preview)
 *  - 'creator':       CourseCreatorTab — AI-powered course creation wizard (for AI-enabled users)
 *  - 'manual-config': ManualCourseConfig — manual course creation wizard (for AI-disabled users)
 */
export const ContentManager = ({ token }) => {
  const { user, isAdmin } = useAuth();
  const canUseAI = isAdmin() || !!user?.aiGenerationEnabled;

  const [view, setView] = useState('list'); // 'list' | 'detail' | 'creator' | 'manual-config'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  // Used to force-remount CourseList (refresh) after publish/delete
  const [listRefreshKey, setListRefreshKey] = useState(0);

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
    setView(canUseAI ? 'creator' : 'manual-config');
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

  if (view === 'creator') {
    return (
      <div className="space-y-3">
        <button
          onClick={goToList}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
        <CourseCreatorTab token={token} onPublishSuccess={goToList} />
      </div>
    );
  }

  if (view === 'manual-config') {
    return (
      <div className="space-y-3">
        <button
          onClick={goToList}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
        <ManualCourseConfig token={token} onCancel={goToList} onCreated={handleManualCourseCreated} />
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
