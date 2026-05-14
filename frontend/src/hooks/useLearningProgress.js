import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as progressService from '../services/progressService';
import * as assessmentService from '../services/assessmentService';

const LearningProgressContext = createContext(null);

export const LearningProgressProvider = ({ children }) => {
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [currentCourseEnrollment, setCurrentCourseEnrollment] = useState(null);
  const [currentLessonProgress, setCurrentLessonProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all course enrollments
  const loadCourseEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const enrollments = await progressService.getStudentCourseEnrollments();
      setCourseEnrollments(enrollments);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load course enrollments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load enrollment for a specific course
  const loadCourseEnrollment = useCallback(async (courseId) => {
    setIsLoading(true);
    setError(null);
    try {
      const enrollment = await progressService.getCourseEnrollment(courseId);
      setCurrentCourseEnrollment(enrollment);
      return enrollment;
    } catch (err) {
      setError(err.message);
      console.error('Failed to load course enrollment:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a course enrollment
  const startCourse = useCallback(async (courseId) => {
    setIsLoading(true);
    setError(null);
    try {
      const enrollment = await progressService.startCourseEnrollment(courseId);
      setCurrentCourseEnrollment(enrollment);
      await loadCourseEnrollments();
      return enrollment;
    } catch (err) {
      setError(err.message);
      console.error('Failed to start course:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadCourseEnrollments]);

  // Update course enrollment
  const updateCourseProgress = useCallback(async (courseId, updates) => {
    setIsLoading(true);
    setError(null);
    try {
      const enrollment = await progressService.updateCourseEnrollment(courseId, updates);
      setCurrentCourseEnrollment(enrollment);
      await loadCourseEnrollments();
      return enrollment;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update course progress:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadCourseEnrollments]);

  // Complete a course
  const completeCourse = useCallback(async (courseId) => {
    setIsLoading(true);
    setError(null);
    try {
      const enrollment = await progressService.completeCourseEnrollment(courseId);
      setCurrentCourseEnrollment(enrollment);
      await loadCourseEnrollments();
      return enrollment;
    } catch (err) {
      setError(err.message);
      console.error('Failed to complete course:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadCourseEnrollments]);

  // Delete a course enrollment
  const deleteCourse = useCallback(async (courseId) => {
    setIsLoading(true);
    setError(null);
    try {
      await progressService.deleteCourseEnrollment(courseId);
      setCurrentCourseEnrollment(null);
      await loadCourseEnrollments();
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete course enrollment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadCourseEnrollments]);

  // Start a lesson
  const startLesson = useCallback(async (lessonId, courseId, moduleId) => {
    setIsLoading(true);
    setError(null);
    try {
      const progress = await progressService.startLessonProgress(lessonId, courseId, moduleId);
      setCurrentLessonProgress(progress);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Failed to start lesson:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load lesson progress
  const loadLessonProgress = useCallback(async (lessonId) => {
    setIsLoading(true);
    setError(null);
    try {
      const progress = await progressService.getLessonProgress(lessonId);
      setCurrentLessonProgress(progress);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Failed to load lesson progress:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update lesson progress
  const updateLessonProgress = useCallback(async (lessonId, updates) => {
    setIsLoading(true);
    setError(null);
    try {
      const progress = await progressService.updateLessonProgress(lessonId, updates);
      setCurrentLessonProgress(progress);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update lesson progress:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Complete a lesson
  const completeLesson = useCallback(async (lessonId) => {
    setIsLoading(true);
    setError(null);
    try {
      const progress = await progressService.completeLessonProgress(lessonId);
      setCurrentLessonProgress(progress);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Failed to complete lesson:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send heartbeat for time tracking
  const sendLessonHeartbeat = useCallback(async (lessonId, additionalSeconds) => {
    try {
      const progress = await progressService.lessonHeartbeat(lessonId, additionalSeconds);
      setCurrentLessonProgress(progress);
      return progress;
    } catch (err) {
      console.error('Failed to send lesson heartbeat:', err);
      // Don't throw for heartbeat errors - they shouldn't interrupt user experience
    }
  }, []);

  // Start an assessment (quiz/assignment)
  const startAssessment = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const attempt = await assessmentService.startAssessmentAttempt(payload);
      return attempt;
    } catch (err) {
      setError(err.message);
      console.error('Failed to start assessment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Submit an assessment
  const submitAssessment = useCallback(async (attemptId, rawScore, maxScore, passed, timeSpentSeconds = 0, feedbackSummary = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const attempt = await assessmentService.submitAssessmentAttempt(attemptId, rawScore, maxScore, passed, timeSpentSeconds, feedbackSummary);
      return attempt;
    } catch (err) {
      setError(err.message);
      console.error('Failed to submit assessment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get best assessment attempt
  const getBestAttempt = useCallback(async (assessmentType, assessmentId) => {
    try {
      const attempt = await assessmentService.getBestAssessmentAttempt(assessmentType, assessmentId);
      return attempt;
    } catch (err) {
      console.error('Failed to get best attempt:', err);
      return null;
    }
  }, []);

  // Get attempts count
  const getAttemptsCount = useCallback(async (assessmentType, assessmentId) => {
    try {
      const result = await assessmentService.getAttemptsCount(assessmentType, assessmentId);
      return result.count;
    } catch (err) {
      console.error('Failed to get attempts count:', err);
      return 0;
    }
  }, []);

  // Get all lesson progress for a course
  const loadCourseLessonProgress = useCallback(async (courseId) => {
    try {
      const progressList = await progressService.getCourseLessonProgress(courseId);
      return progressList;
    } catch (err) {
      console.error('Failed to load course lesson progress:', err);
      return [];
    }
  }, []);

  // Clear current state
  const clearCurrentState = useCallback(() => {
    setCurrentCourseEnrollment(null);
    setCurrentLessonProgress(null);
  }, []);

  return (
    <LearningProgressContext.Provider
      value={{
        courseEnrollments,
        currentCourseEnrollment,
        currentLessonProgress,
        isLoading,
        error,
        loadCourseEnrollments,
        loadCourseEnrollment,
        startCourse,
        updateCourseProgress,
        completeCourse,
        deleteCourse,
        startLesson,
        loadLessonProgress,
        updateLessonProgress,
        completeLesson,
        sendLessonHeartbeat,
        startAssessment,
        submitAssessment,
        getBestAttempt,
        getAttemptsCount,
        loadCourseLessonProgress,
        clearCurrentState,
      }}
    >
      {children}
    </LearningProgressContext.Provider>
  );
};

export const useLearningProgress = () => {
  const context = useContext(LearningProgressContext);
  if (!context) {
    throw new Error('useLearningProgress must be used within LearningProgressProvider');
  }
  return context;
};
