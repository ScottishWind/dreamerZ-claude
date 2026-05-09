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
// Assessment Attempts
// ---------------------------------------------------------------------------

export const startAssessmentAttempt = async (payload) => {
  const response = await fetch(`${API_BASE}/api/assessments/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start assessment');
  }
  return response.json();
};

export const submitAssessmentAttempt = async (attemptId, rawScore, maxScore, passed, timeSpentSeconds = 0, feedbackSummary = null) => {
  const params = new URLSearchParams({
    attempt_id: attemptId,
    raw_score: rawScore,
    max_score: maxScore,
    passed: passed,
    time_spent_seconds: timeSpentSeconds
  });
  if (feedbackSummary) params.append('feedback_summary', feedbackSummary);

  const response = await fetch(`${API_BASE}/api/assessments/attempts/${attemptId}/submit?${params}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      raw_score: rawScore,
      max_score: maxScore,
      passed,
      time_spent_seconds: timeSpentSeconds,
      feedback_summary: feedbackSummary
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit assessment');
  }
  return response.json();
};

export const gradeAssessmentAttempt = async (attemptId, gradedByUserId, graderType, rawScore = null, maxScore = null, passed = null, feedbackSummary = null) => {
  const response = await fetch(`${API_BASE}/api/assessments/attempts/${attemptId}/grade`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      attempt_id: attemptId,
      graded_by_user_id: gradedByUserId,
      grader_type: graderType,
      raw_score: rawScore,
      max_score: maxScore,
      passed: passed,
      feedback_summary: feedbackSummary
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to grade assessment');
  }
  return response.json();
};

export const getAssessmentAttempt = async (attemptId) => {
  const response = await fetch(`${API_BASE}/api/assessments/attempts/${attemptId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get assessment attempt');
  }
  return response.json();
};

export const getStudentAssessmentAttempts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.assessment_type) params.append('assessment_type', filters.assessment_type);
  if (filters.assessment_id) params.append('assessment_id', filters.assessment_id);
  if (filters.lesson_id) params.append('lesson_id', filters.lesson_id);

  const response = await fetch(`${API_BASE}/api/assessments/attempts?${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get assessment attempts');
  }
  return response.json();
};

export const getBestAssessmentAttempt = async (assessmentType, assessmentId) => {
  const response = await fetch(`${API_BASE}/api/assessments/best?assessment_type=${assessmentType}&assessment_id=${assessmentId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get best assessment attempt');
  }
  return response.json();
};

export const getAttemptsCount = async (assessmentType, assessmentId) => {
  const response = await fetch(`${API_BASE}/api/assessments/attempts/count?assessment_type=${assessmentType}&assessment_id=${assessmentId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get attempts count');
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Assessment Answers (Question-level detail)
// ---------------------------------------------------------------------------

export const createAssessmentAnswer = async (payload) => {
  const response = await fetch(`${API_BASE}/api/assessments/answers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create assessment answer');
  }
  return response.json();
};

export const getAssessmentAnswers = async (attemptId) => {
  const response = await fetch(`${API_BASE}/api/assessments/attempts/${attemptId}/answers`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get assessment answers');
  }
  return response.json();
};
