import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Clock, Award, AlertTriangle, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as parentService from '../services/parentService';

export const ParentDashboard = () => {
  const { isAuthenticated, isSupervisor } = useAuth();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentUsername, setStudentUsername] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStudents();
  }, [isAuthenticated]);

  const loadStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use supervisor endpoints if user is supervisor, otherwise use parent endpoints
      let studentsData;
      if (isSupervisor()) {
        const rawSupervisorData = await parentService.getSupervisorLearners();
        // Normalize supervisor payload to match parent-student shape used by StudentCard
        studentsData = rawSupervisorData.map((s) => ({
          user_id: s.learner_id,
          learner_id: s.learner_id,
          username: s.learner_username,
          email: s.learner_email,
          relationship_type: 'supervisor',
        }));
      } else {
        studentsData = await parentService.getParentStudents();
      }
      setStudents(studentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentUsername.trim()) return;

    try {
      await parentService.createParentStudentLinkByIdentifier(studentUsername.trim(), 'guardian');
      setStudentUsername('');
      setShowAddStudent(false);
      loadStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-slate-600">Please log in to access the parent dashboard.</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isSupervisor() ? 'Supervisor Dashboard' : 'Parent Dashboard'}
          </h1>
          <p className="text-slate-600">
            {isSupervisor() ? 'Monitor assigned learners\' progress' : 'Monitor your children\'s learning progress'}
          </p>
        </div>

        {/* Add Student Button - only for parents, supervisors get assigned by admin */}
        {!isSupervisor() && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Student
            </button>
          </div>
        )}

        {/* Add Student Form */}
        {showAddStudent && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Link a Student Account</h3>
            <form onSubmit={handleAddStudent} className="flex gap-4">
              <input
                type="text"
                placeholder="Student username or email"
                value={studentUsername}
                onChange={(e) => setStudentUsername(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Link Student
              </button>
            </form>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
            {error}
          </div>
        )}

        {/* Students Grid */}
        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Students Linked Yet</h3>
            <p className="text-slate-500 mb-4">Link your child's account to monitor their progress</p>
            <button
              onClick={() => setShowAddStudent(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Student
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <StudentCard key={student.user_id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StudentCard = ({ student }) => {
  const { isSupervisor } = useAuth();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadOverview();
    }
  }, [isExpanded]);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      // Use supervisor progress endpoint if user is supervisor
      const data = isSupervisor()
        ? await parentService.getLearnerProgress(student.learner_id || student.user_id)
        : await parentService.getStudentOverview(student.user_id);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load student overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{student.username}</h3>
            <p className="text-sm text-slate-500">{student.email}</p>
            {student.relationship_type && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                {student.relationship_type}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4 text-slate-500">Loading progress...</div>
          ) : overview ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard
                  icon={BookOpen}
                  label="Courses"
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
                  icon={AlertTriangle}
                  label="In Progress"
                  value={overview.stats.in_progress_courses}
                  color="amber"
                />
              </div>

              {/* Course List */}
              {overview.enrollments && overview.enrollments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Enrolled Courses</h4>
                  <div className="space-y-2">
                    {overview.enrollments.slice(0, 3).map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            Course ID: {enrollment.course_id}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${enrollment.completion_percent}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{Math.round(enrollment.completion_percent)}%</span>
                          </div>
                        </div>
                        <span
                          className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                            enrollment.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : enrollment.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  {overview.enrollments.length > 3 && (
                    <Link
                      to={`/parent/students/${student.user_id}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View all courses
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}

              {/* View Details Button */}
              <Link
                to={`/parent/students/${student.user_id}`}
                className="mt-6 block w-full text-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                View Detailed Progress
              </Link>
            </>
          ) : (
            <div className="text-center py-4 text-slate-500">
              Unable to load progress data
            </div>
          )}
        </div>
      )}
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
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
};

export default ParentDashboard;
