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
// Parent-Student Links
// ---------------------------------------------------------------------------

export const createParentStudentLink = async (studentUserId, relationshipType = null) => {
  const response = await fetch(`${API_BASE}/api/parent/links?student_user_id=${studentUserId}${relationshipType ? `&relationship_type=${relationshipType}` : ''}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ student_user_id: studentUserId, relationship_type: relationshipType })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create parent-student link');
  }
  return response.json();
};

export const createParentStudentLinkByIdentifier = async (studentIdentifier, relationshipType = null) => {
  const response = await fetch(`${API_BASE}/api/parent/links/by-identifier`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      student_identifier: studentIdentifier,
      relationship_type: relationshipType
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to link student account');
  }
  return response.json();
};

export const getParentStudentLinks = async (studentUserId = null, isActive = null) => {
  const params = new URLSearchParams();
  if (studentUserId) params.append('student_user_id', studentUserId);
  if (isActive !== null) params.append('is_active', isActive);

  const response = await fetch(`${API_BASE}/api/parent/links?${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get parent-student links');
  }
  return response.json();
};

export const updateParentStudentLink = async (linkId, updates) => {
  const response = await fetch(`${API_BASE}/api/parent/links/${linkId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update parent-student link');
  }
  return response.json();
};

export const deactivateParentStudentLink = async (linkId) => {
  const response = await fetch(`${API_BASE}/api/parent/links/${linkId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to deactivate parent-student link');
  }
  return response.json();
};

export const getParentStudents = async () => {
  const response = await fetch(`${API_BASE}/api/parent/students`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get parent students');
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Parent Reporting
// ---------------------------------------------------------------------------

export const getStudentOverview = async (studentUserId) => {
  const response = await fetch(`${API_BASE}/api/parent/students/${studentUserId}/overview`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get student overview');
  }
  return response.json();
};

export const getStudentCourses = async (studentUserId) => {
  const response = await fetch(`${API_BASE}/api/parent/students/${studentUserId}/courses`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get student courses');
  }
  return response.json();
};

export const getStudentCourseReport = async (studentUserId, courseId) => {
  const response = await fetch(`${API_BASE}/api/parent/students/${studentUserId}/courses/${courseId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get student course report');
  }
  return response.json();
};

export const getStudentCourseLessons = async (studentUserId, courseId) => {
  const response = await fetch(`${API_BASE}/api/parent/students/${studentUserId}/courses/${courseId}/lessons`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get student course lessons');
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Supervisor-Student Links (new supervisor-specific endpoints)
// ---------------------------------------------------------------------------

export const getSupervisorLearners = async () => {
  const response = await fetch(`${API_BASE}/api/admin/supervisor/learners`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get supervisor learners');
  }
  return response.json();
};

// Supervisor self-link: identifies the current user via the auth token and
// creates a SupervisorAssignment to the learner with the given username/email.
// Idempotent — the backend returns the existing assignment if one is already
// in place (with `already_linked: true`).
export const linkSupervisorLearnerByIdentifier = async (learnerIdentifier) => {
  const response = await fetch(`${API_BASE}/api/admin/supervisor/me/learners`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ learner_identifier: learnerIdentifier })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to link learner');
  }
  return response.json();
};

export const getLearnerProgress = async (learnerId) => {
  const response = await fetch(`${API_BASE}/api/admin/supervisor/learners/${learnerId}/progress`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get learner progress');
  }
  return response.json();
};

export const unlinkSupervisorLearner = async (learnerUsername) => {
  const response = await fetch(`${API_BASE}/api/admin/supervisor/me/learners/${learnerUsername}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unlink learner');
  }
  return response.json();
};
