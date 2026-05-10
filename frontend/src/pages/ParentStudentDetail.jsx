import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Award, AlertTriangle, TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as parentService from '../services/parentService';

export const ParentStudentDetail = () => {
  const { studentUserId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseReport, setCourseReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, studentUserId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, coursesData] = await Promise.all([
        parentService.getStudentOverview(studentUserId),
        parentService.getStudentCourses(studentUserId),
      ]);
      setOverview(overviewData);
      setCourses(coursesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseReport = async (courseId) => {
    try {
      const report = await parentService.getStudentCourseReport(studentUserId, courseId);
      setCourseReport(report);
      setSelectedCourse(courseId);
    } catch (err) {
      console.error('Failed to load course report:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-slate-600">Please log in to access this page.</p>
          <Link to="/login" className="mt-4 inline-block text-primary hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/parent"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Parent Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {overview?.student?.username || 'Student'} Progress
          </h1>
          <p className="text-slate-600">
            {overview?.student?.email}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
            {error}
          </div>
        )}

        {overview && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={BookOpen}
                label="Total Courses"
                value={overview.stats.total_courses}
                color="blue"
              />
              <StatCard
                icon={Award}
                label="Completed"
                value={overview.stats.completed_courses}
                color="emerald"
              />
              <StatCard
                icon={Clock}
                label="Time Spent"
                value={`${overview.stats.total_time_spent_hours}h`}
                color="purple"
              />
              <StatCard
                icon={TrendingUp}
                label="In Progress"
                value={overview.stats.in_progress_courses}
                color="amber"
              />
            </div>

            {/* Courses Section */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-900">Course Progress</h2>
              </div>

              {courses.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No courses enrolled yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      isSelected={selectedCourse === course.course_id}
                      onSelect={() => loadCourseReport(course.course_id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Course Detail Report */}
            {courseReport && (
              <div className="mt-8 bg-white rounded-xl border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {courseReport.course?.name || 'Course Details'}
                  </h2>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="p-6">
                  {/* Enrollment Info */}
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Enrollment Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="font-medium text-slate-900 capitalize">{courseReport.enrollment.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Completion</p>
                        <p className="font-medium text-slate-900">{Math.round(courseReport.enrollment.completion_percent)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Lessons Done</p>
                        <p className="font-medium text-slate-900">
                          {courseReport.enrollment.lessons_completed_count} / {courseReport.enrollment.total_lessons_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Time Spent</p>
                        <p className="font-medium text-slate-900">
                          {Math.round(courseReport.enrollment.total_time_spent_seconds / 60)} min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assessment Stats */}
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Assessment Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Quiz Attempts</p>
                        <p className="font-medium text-slate-900">{courseReport.assessment_stats.total_quiz_attempts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Avg Quiz Score</p>
                        <p className="font-medium text-slate-900">
                          {courseReport.assessment_stats.average_quiz_score
                            ? `${Math.round(courseReport.assessment_stats.average_quiz_score)}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Assignment Attempts</p>
                        <p className="font-medium text-slate-900">{courseReport.assessment_stats.total_assignment_attempts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Avg Assignment Score</p>
                        <p className="font-medium text-slate-900">
                          {courseReport.assessment_stats.average_assignment_score
                            ? `${Math.round(courseReport.assessment_stats.average_assignment_score)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Flags */}
                  {courseReport.risk_flags && courseReport.risk_flags.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Attention Needed
                      </h3>
                      <ul className="space-y-1">
                        {courseReport.risk_flags.map((flag, index) => (
                          <li key={index} className="text-sm text-amber-700 capitalize">
                            {flag.replace(/_/g, ' ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Lesson Progress */}
                  {courseReport.lesson_progress && courseReport.lesson_progress.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Lesson Progress</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {courseReport.lesson_progress.map((lesson) => (
                          <LessonProgressRow key={lesson.id} lesson={lesson} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
};

const CourseRow = ({ course, isSelected, onSelect }) => {
  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-slate-100 text-slate-600',
    dropped: 'bg-rose-100 text-rose-700',
    paused: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={onSelect}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[course.status]}`}
            >
              {course.status}
            </span>
            <p className="font-medium text-slate-900">Course ID: {course.course_id}</p>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1 max-w-md h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${course.completion_percent}%` }}
              />
            </div>
            <span className="text-sm text-slate-500">{Math.round(course.completion_percent)}%</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>{course.lessons_completed_count} / {course.total_lessons_count} lessons</span>
            {course.last_accessed_at && (
              <span>Last active: {new Date(course.last_accessed_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        {isSelected ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300" />
        )}
      </div>
    </div>
  );
};

const LessonProgressRow = ({ lesson }) => {
  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[lesson.status]}`}
          >
            {lesson.status}
          </span>
          <p className="text-sm font-medium text-slate-700">Lesson ID: {lesson.lesson_id}</p>
        </div>
        {lesson.mastery_level && (
          <span className="ml-2 text-xs text-slate-500 capitalize">Mastery: {lesson.mastery_level}</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {lesson.best_score && <span>Best: {Math.round(lesson.best_score)}%</span>}
        {lesson.time_spent_seconds && <span>{Math.round(lesson.time_spent_seconds / 60)} min</span>}
      </div>
    </div>
  );
};

export default ParentStudentDetail;
