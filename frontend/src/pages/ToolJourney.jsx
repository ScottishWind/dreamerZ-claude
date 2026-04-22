import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, FlaskConical, MessageCircle, ArrowLeft } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { useLanguage } from '../hooks/useLanguage';
import { JourneyPlayer } from '../components/JourneyPlayer';
import { PromptLabPanel } from '../components/PromptLabPanel';
import { RoleplayChat } from '../components/RoleplayChat';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

// AI tools that get the Prompt Lab tab
const AI_TOOL_IDS = ['chatgpt', 'claude', 'gemini', 'canva', 'syllaby'];

export const ToolJourney = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('modules');
  const {
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  } = useProgress();

  const { language } = useLanguage();
  const isAITool = AI_TOOL_IDS.includes(toolId);
  const isEnglish = toolId === 'spoken-english-30day';

  // Build available tabs based on tool type
  const tabs = [
    { id: 'modules', label: 'Modules', icon: BookOpen },
    ...(isAITool ? [{ id: 'prompt-lab', label: 'Prompt Lab', icon: FlaskConical }] : []),
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
        // Try legacy tools endpoint first, then published courses
        let response = await fetch(`${API_BASE}/api/content/tools/${toolId}${langParam}`);
        if (!response.ok) {
          // Not a legacy tool — try the courses endpoint
          response = await fetch(`${API_BASE}/api/content/courses/${toolId}${langParam}`);
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || data.message || 'Failed to load content.');
          }
        }
        const data = await response.json();
        setTool(data);
      } catch (err) {
        setError(err.message || 'Failed to load tool content.');
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
          modules={tool.modules}
          isModuleCompleted={isModuleCompleted}
          isModuleUnlocked={isModuleUnlocked}
          getModuleProgress={getModuleProgress}
          completeModule={completeModule}
          previewVideoUrl="https://www.youtube.com/embed/zegMOOKy_6A"
        />
      )}

      {activeTab === 'prompt-lab' && isAITool && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PromptLabPanel toolId={toolId} />
        </div>
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
