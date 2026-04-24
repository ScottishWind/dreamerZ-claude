import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CourseList } from './CourseList';
import { CourseDetail } from './CourseDetail';
import { CourseCreatorTab } from './CourseCreatorTab';

/**
 * ContentManager orchestrates three sub-views for admin course management:
 *  - 'list':     CourseList (default) — search, filter, select a course, or click "New Course"
 *  - 'detail':   CourseDetail — view/edit one course (modules, lessons, learner preview)
 *  - 'creator':  CourseCreatorTab — AI-powered course creation wizard (existing component)
 */
export const ContentManager = ({ token }) => {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'creator'
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
    setView('creator');
  };

  if (view === 'detail' && selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        token={token}
        onBack={goToList}
        onCourseDeleted={goToList}
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
