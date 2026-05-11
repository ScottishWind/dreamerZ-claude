import { useState, useEffect } from 'react';
import { GraduationCap, AlertTriangle, X } from 'lucide-react';
import { formatErrorDetail } from '../../lib/utils';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const adminJson = async (path, token, options = {}) => {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatErrorDetail(err.detail) || `Request failed (${res.status})`);
  }
  return res.json();
};

export const ManualCourseConfig = ({ token, onCancel, onCreated }) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/api/content/categories`)
      .then(r => r.json())
      .then(data => {
        const catArray = Array.isArray(data) ? data : [];
        setCategories(catArray);
        if (catArray.length > 0 && !categoryId) {
          setCategoryId(catArray[0].id);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  const handleCreate = async () => {
    const errors = {};
    if (!courseTitle.trim()) errors.courseTitle = 'Course title is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (isNewCategory) {
      if (!newCategoryName.trim()) errors.category = 'Enter a name for the new category.';
    } else if (!categoryId) {
      errors.category = 'Please select or create a category.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fill in the highlighted fields.');
      return;
    }
    setFieldErrors({});
    setBusy(true);
    setError('');

    try {
      let finalCategoryId = categoryId;
      if (isNewCategory && newCategoryName.trim()) {
        const created = await adminJson('/admin/categories', token, {
          method: 'POST',
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        finalCategoryId = created.id;
        setCategoryId(created.id);
        setCategories(prev => [...prev, created]);
        setIsNewCategory(false);
        setNewCategoryName('');
      }

      const course = await adminJson('/admin/courses', token, {
        method: 'POST',
        body: JSON.stringify({
          name: courseTitle.trim(),
          description: description.trim(),
          category_id: finalCategoryId,
          difficulty,
        }),
      });

      onCreated(course.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-900">Course Creator</h2>
        </div>
        <p className="text-sm text-slate-600">
          Configure your course details. After creating, you can add modules and lessons manually, preview, and publish.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid sm:grid-cols-1 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Course Title *</span>
            <input
              required
              value={courseTitle}
              onChange={(e) => {
                setCourseTitle(e.target.value);
                if (e.target.value.trim()) setFieldErrors((fe) => ({ ...fe, courseTitle: undefined }));
              }}
              placeholder="Enter course title"
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.courseTitle ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-primary/40'}`}
            />
            {fieldErrors.courseTitle && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.courseTitle}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description *</span>
            <textarea
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim()) setFieldErrors((fe) => ({ ...fe, description: undefined }));
              }}
              rows={3}
              placeholder="Briefly describe what learners will gain from this course"
              className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.description ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-primary/40'}`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Category *</span>
            {!isNewCategory ? (
              <select
                value={categoryId}
                onChange={(e) => {
                  setFieldErrors((fe) => ({ ...fe, category: undefined }));
                  if (e.target.value === '__new__') {
                    setIsNewCategory(true);
                  } else {
                    setCategoryId(e.target.value);
                  }
                }}
                className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.category ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-primary/40'}`}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="__new__">➕ Create new category</option>
              </select>
            ) : (
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (e.target.value.trim()) setFieldErrors((fe) => ({ ...fe, category: undefined }));
                  }}
                  placeholder="Enter new category name"
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.category ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-primary/40'}`}
                />
                <button
                  onClick={() => {
                    setIsNewCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            )}
            {fieldErrors.category && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.category}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Difficulty Level</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualCourseConfig;
