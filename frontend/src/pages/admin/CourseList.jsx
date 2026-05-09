import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, BookOpen, RefreshCw, Sparkles, AlertTriangle, X,
  Folder, Trash2,
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

export const CourseList = ({ token, onSelectCourse, onNewCourse }) => {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [coursesData, catsData] = await Promise.all([
        adminFetch('/courses', token).catch(() => []),
        adminFetch('/categories', token).catch(() => []),
      ]);
      setCourses(coursesData);
      setCategories(catsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (categoryFilter !== 'all' && c.category_id !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(q) ||
               (c.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [courses, search, categoryFilter]);

  const categoryNameMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const deleteCourse = useCallback(async (courseId, courseName) => {
    if (!window.confirm(`Delete "${courseName}" and all its content? This cannot be undone.`)) return;
    try {
      await adminFetch(`/courses/${courseId}`, token, { method: 'DELETE' });
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }, [token, loadData]);

  const deleteCategory = useCallback(async (catId, catName) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      await adminFetch(`/categories/${catId}`, token, { method: 'DELETE' });
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }, [token, loadData]);

  return (
    <div className="space-y-4">
      {/* Header with search and New Course */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <button
          onClick={onNewCourse}
          className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          New Course
        </button>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({courses.length})
          </button>
          {categories.map(cat => {
            const count = courses.filter(c => c.category_id === cat.id).length;
            const isEmpty = count === 0;
            const isActive = categoryFilter === cat.id;
            return (
              <span
                key={cat.id}
                className={`inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-xs font-medium transition-colors ${
                  isEmpty
                    ? 'bg-slate-50 text-slate-400 border border-dashed border-slate-200'
                    : isActive
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => !isEmpty && setCategoryFilter(cat.id)}
                  disabled={isEmpty}
                  className="py-0.5 disabled:cursor-default"
                >
                  {cat.name} ({count})
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id, cat.name)}
                  className={`p-1 rounded-full transition-colors ${
                    isActive ? 'hover:bg-white/20' : 'hover:bg-red-100 hover:text-red-600'
                  }`}
                  aria-label={`Delete category ${cat.name}`}
                  title={isEmpty
                    ? `Delete empty category "${cat.name}"`
                    : `Delete category "${cat.name}" (will fail if it has courses)`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Courses grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading courses...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            {search || categoryFilter !== 'all'
              ? 'No courses match your filters.'
              : 'No courses yet. Click "New Course" to create one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="relative bg-white rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all group"
            >
              <button
                type="button"
                onClick={() => deleteCourse(course.id, course.name)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                aria-label={`Delete course ${course.name}`}
                title="Delete course"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectCourse(course.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  {course.status === 'draft' && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold mr-7">
                      Draft
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors line-clamp-2 pr-7">
                  {course.name}
                </h3>
                {course.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {categoryNameMap[course.category_id] || course.category_id || 'Uncategorized'}
                  </span>
                  <span>·</span>
                  <span>{course.lesson_count || course.total_lessons || 0} lessons</span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
