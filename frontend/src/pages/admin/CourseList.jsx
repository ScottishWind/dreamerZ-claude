import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, BookOpen, RefreshCw, Sparkles, AlertTriangle, X,
  Folder,
} from 'lucide-react';

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
    throw new Error(err.detail || `Request failed (${res.status})`);
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
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({count})
              </button>
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
            <button
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                {course.status === 'draft' && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                    Draft
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors line-clamp-2">
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
          ))}
        </div>
      )}
    </div>
  );
};
