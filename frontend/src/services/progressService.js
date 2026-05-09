const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const getAuthHeaders = () => {
  const STORAGE_KEY = 'dreamerz_beta_auth_v1';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const auth = JSON.parse(stored);
    return {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Failed to get auth headers', error);
    return { 'Content-Type': 'application/json' };
  }
};

// ---------------------------------------------------------------------------
// Course Enrollment Progress
// ---------------------------------------------------------------------------

export const startCourseEnrollment = async (courseId) => {
  const response = await fetch(`${API_BASE}/api/progress/courses/${courseId}/start`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start course enrollment');
  }
  return response.json();
};

export const getCourseEnrollment = async (courseId) => {
  const response = await fetch(`${API_BASE}/api/progress/courses/${courseId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course enrollment');
  }
  return response.json();
};

export const updateCourseEnrollment = async (courseId, updates) => {
  const response = await fetch(`${API_BASE}/api/progress/courses/${courseId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update course enrollment');
  }
  return response.json();
};

export const getStudentCourseEnrollments = async () => {
  const response = await fetch(`${API_BASE}/api/progress/courses`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course enrollments');
  }
  return response.json();
};

export const completeCourseEnrollment = async (courseId) => {
  const response = await fetch(`${API_BASE}/api/progress/courses/${courseId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to complete course');
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Lesson Progress
// ---------------------------------------------------------------------------

export const startLessonProgress = async (lessonId, courseId, moduleId) => {
  const response = await fetch(`${API_BASE}/api/progress/lessons/${lessonId}/start?course_id=${courseId}&module_id=${moduleId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start lesson');
  }
  return response.json();
};

export const getLessonProgress = async (lessonId) => {
  const response = await fetch(`${API_BASE}/api/progress/lessons/${lessonId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get lesson progress');
  }
  return response.json();
};

export const updateLessonProgress = async (lessonId, updates) => {
  const response = await fetch(`${API_BASE}/api/progress/lessons/${lessonId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update lesson progress');
  }
  return response.json();
};

export const completeLessonProgress = async (lessonId) => {
  const response = await fetch(`${API_BASE}/api/progress/lessons/${lessonId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to complete lesson');
  }
  return response.json();
};

export const getCourseLessonProgress = async (courseId) => {
  const response = await fetch(`${API_BASE}/api/progress/courses/${courseId}/lessons`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course lesson progress');
  }
  return response.json();
};

export const lessonHeartbeat = async (lessonId, additionalSeconds) => {
  const response = await fetch(`${API_BASE}/api/progress/lessons/${lessonId}/heartbeat?additional_seconds=${additionalSeconds}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update lesson time');
  }
  return response.json();
};
