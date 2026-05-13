import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Clock, Award, AlertTriangle, Plus, ArrowRight, ChevronDown, ChevronUp, X, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as parentService from '../services/parentService';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ParentDashboard = () => {
  const { isAuthenticated, isSupervisor, token } = useAuth();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentUsername, setStudentUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const isSelectingRef = useRef(false);
  const lastSelectedUsernameRef = useRef(null);
  const lastSearchedQueryRef = useRef(null);
  const dropdownRef = useRef(null);
  const submitButtonRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStudents();
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for users
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Don't search if user is selecting from dropdown
      if (isSelectingRef.current) return;
      
      // Don't search if the current username matches the last selected username (user likely just selected it)
      if (lastSelectedUsernameRef.current && lastSelectedUsernameRef.current.toLowerCase() === studentUsername.toLowerCase()) {
        setShowDropdown(false);
        return;
      }
      
      // Don't search if we've already searched for this exact query
      if (lastSearchedQueryRef.current && lastSearchedQueryRef.current.toLowerCase() === studentUsername.toLowerCase()) {
        return;
      }
      
      // Clear the last selected ref if user is typing something different
      if (lastSelectedUsernameRef.current && lastSelectedUsernameRef.current.toLowerCase() !== studentUsername.toLowerCase()) {
        lastSelectedUsernameRef.current = null;
      }
      
      if (studentUsername.length >= 3) {
        setIsSearching(true);
        lastSearchedQueryRef.current = studentUsername;
        try {
          const response = await fetch(`${API_BASE}/api/admin/users/search?q=${encodeURIComponent(studentUsername)}&role=learner`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const results = await response.json();
            setSearchResults(results);
            setShowDropdown(results.length > 0);
          }
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
        lastSearchedQueryRef.current = null;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentUsername, token]);

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
    const identifier = studentUsername.trim();
    if (!identifier) return;

    try {
      if (isSupervisor()) {
        await parentService.linkSupervisorLearnerByIdentifier(identifier);
      } else {
        await parentService.createParentStudentLinkByIdentifier(identifier, 'guardian');
      }
      setStudentUsername('');
      setSearchResults([]);
      setShowDropdown(false);
      setShowAddStudent(false);
      loadStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectUser = (user) => {
    isSelectingRef.current = true;
    lastSelectedUsernameRef.current = user.username;
    lastSearchedQueryRef.current = null; // Clear last searched query so we don't match it
    setStudentUsername(user.username);
    setSearchResults([]);
    setShowDropdown(false);
    // Focus the submit button so user can press Enter to submit
    setTimeout(() => {
      if (submitButtonRef.current) {
        submitButtonRef.current.focus();
      }
    }, 100);
    // Reset selecting flag after a longer delay to ensure debounce completes
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 500);
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

        {/* Add Student Button — visible for both parents and supervisors.
            Supervisors call /api/admin/supervisor/me/learners; parents call
            /api/parent/links/by-identifier — the routing happens inside
            handleAddStudent based on the user's role.
            Only show if there are already students linked. */}
        {students.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {isSupervisor() ? 'Add Learner' : 'Add Student'}
            </button>
          </div>
        )}

        {/* Add Student Form */}
        {showAddStudent && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Link a Student</h3>
            <form onSubmit={handleAddStudent} className="relative">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="w-full sm:flex-1 relative" ref={dropdownRef}>
                  <input
                    type="text"
                    placeholder="Student username or email"
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {studentUsername && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentUsername('');
                        setSearchResults([]);
                        setShowDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{user.username}</div>
                              <div className="text-sm text-slate-500">{user.email}</div>
                            </div>
                            <div className="text-xs text-slate-400 capitalize">{user.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    ref={submitButtonRef}
                    className="flex-1 sm:flex-none px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Link Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStudent(false);
                      setStudentUsername('');
                      setSearchResults([]);
                      setShowDropdown(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {isSearching && (
                <div className="mt-2 text-sm text-slate-500">Searching...</div>
              )}
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
        {students.length === 0 && !showAddStudent ? (
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
              <StudentCard key={student.user_id} student={student} onUnlink={loadStudents} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StudentCard = ({ student, onUnlink }) => {
  const { isSupervisor } = useAuth();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadOverview();
    }
  }, [isExpanded]);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
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

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await parentService.unlinkSupervisorLearner(student.username);
      setShowConfirm(false);
      if (onUnlink) {
        onUnlink();
      }
    } catch (err) {
      console.error('Failed to unlink learner:', err);
      alert(err.message || 'Failed to unlink learner');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Card Header */}
      <div 
        className="p-6 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900 truncate">{student.username}</h3>
              {student.relationship_type && (
                <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                  {student.relationship_type}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate">{student.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {isSupervisor() && (
              showConfirm ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink();
                    }}
                    disabled={isUnlinking}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    {isUnlinking ? 'Unlinking...' : 'Confirm'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirm(false);
                    }}
                    className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                  }}
                  className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-rose-500 hover:text-rose-700"
                  title="Unlink learner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              title={isExpanded ? 'Collapse details' : 'View details'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
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
