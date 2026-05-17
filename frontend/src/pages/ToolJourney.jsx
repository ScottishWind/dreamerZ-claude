import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, MessageCircle, ArrowLeft } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { useLanguage } from '../hooks/useLanguage';
import { useLearningProgress } from '../hooks/useLearningProgress';
import { JourneyPlayer } from '../components/JourneyPlayer';
import { RoleplayChat } from '../components/RoleplayChat';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const numericId = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};


export const ToolJourney = () => {
  const { toolId, categoryName } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('modules');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const {
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  } = useProgress();

  const { language } = useLanguage();
  const { startCourse, loadCourseEnrollment } = useLearningProgress();
  const isEnglish = toolId === 'spoken-english-30day';
  const courseDbId = numericId(tool?.db_id || tool?.course_id || tool?.id);

  // Build available tabs based on tool type
  const tabs = [
    { id: 'modules', label: 'Modules', icon: BookOpen },
    ...(isEnglish ? [{ id: 'roleplay', label: 'Roleplay', icon: MessageCircle }] : []),
  ];

  // Reset to modules tab when toolId changes
  useEffect(() => {
    setActiveTab('modules');
  }, [toolId]);

  useEffect(() => {
    const fetchTool = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const langParam = language && language !== 'en' ? `?lang=${language}` : '';
        // Prefer published courses endpoint for hierarchical sections, then fall back to legacy tools
        let response = await fetch(`${API_BASE}/api/content/courses/${toolId}${langParam}`);
        if (!response.ok) {
          // Not a published course — try the legacy tools endpoint
          response = await fetch(`${API_BASE}/api/content/tools/${toolId}${langParam}`);
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || data.message || 'Failed to load content.');
          }
        }

        const data = await response.json();

        // If data has sections (new LMS structure), pass them directly to JourneyPlayer
        if (data.sections && Array.isArray(data.sections)) {
          setTool(data);
        } else {
          // Legacy structure or already flat - convert to sections format for consistency
          setTool({
            ...data,
            sections: [
              {
                id: 'default',
                title: 'Lessons',
                sort_order: 0,
                lessons: data.modules || [],
              },
            ],
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (toolId) {
      fetchTool();
    }
  }, [toolId, language]);

  useEffect(() => {
    if (!isLoading && !tool) {
      navigate('/learn');
    }
  }, [isLoading, tool, navigate]);

  // Check enrollment status when tool is loaded
  useEffect(() => {
    const checkEnrollment = async () => {
      if (courseDbId) {
        try {
          await loadCourseEnrollment(courseDbId);
          setIsEnrolled(true);
        } catch (err) {
          // User is not enrolled
          setIsEnrolled(false);
        }
      }
    };
    checkEnrollment();
  }, [courseDbId, loadCourseEnrollment]);

  const handleEnroll = async () => {
    if (!courseDbId) return;
    setIsEnrolling(true);
    setError(null);
    try {
      await startCourse(courseDbId);
      setIsEnrolled(true);
    } catch (err) {
      setError(err.message || 'Failed to enroll in course');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading course content...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!tool) return null;

  // Show enrollment UI if user is not enrolled
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{tool.name}</h1>
            <p className="text-slate-600 mb-8">
              You need to enroll the course before you can start learning.
            </p>
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
            </button>
            <div className="mt-6">
              <Link
                to="/learn"
                className="text-sm text-slate-500 hover:text-primary transition-colors"
              >
                Back to Learn Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      {/* Back link + tool name + tab bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/learn"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Learn
          </Link>
          <span className="text-slate-300">|</span>
          <h2 className="text-lg font-semibold text-slate-900">{tool.name}</h2>
        </div>

        {/* Tab bar (only show if more than 1 tab) */}
        {tabs.length > 1 && (
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  data-testid={`journey-tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'modules' && (
        <JourneyPlayer
          tool={tool}
          sections={tool.sections}
          isModuleCompleted={isModuleCompleted}
          isModuleUnlocked={isModuleUnlocked}
          getModuleProgress={getModuleProgress}
          completeModule={completeModule}
          previewVideoUrl="https://www.youtube.com/embed/zegMOOKy_6A"
        />
      )}

      {activeTab === 'roleplay' && isEnglish && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RoleplayChat toolId={toolId} />
        </div>
      )}
    </div>
  );
};

export default ToolJourney;
