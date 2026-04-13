import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { useEnrollment } from '../hooks/useEnrollment';
import { JourneyPlayer } from '../components/JourneyPlayer';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ToolJourney = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const {
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  } = useProgress();

  const {
    enrolled,
    freeModuleCount,
    previewVideoUrl,
    pricing,
    isModuleFree,
    isLoading: enrollmentLoading,
  } = useEnrollment(toolId);

  useEffect(() => {
    const fetchTool = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/content/tools/${toolId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || data.message || 'Failed to load tool content.');
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
  }, [toolId]);

  useEffect(() => {
    if (!isLoading && !tool) {
      navigate('/tools');
    }
  }, [isLoading, tool, navigate]);

  if (isLoading || enrollmentLoading) {
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

  // Use API video URL if available, otherwise fallback to hardcoded default
  const videoUrl = previewVideoUrl || 'https://www.youtube.com/embed/zegMOOKy_6A';

  return (
    <JourneyPlayer
      tool={tool}
      modules={tool.modules}
      isModuleCompleted={isModuleCompleted}
      isModuleUnlocked={isModuleUnlocked}
      getModuleProgress={getModuleProgress}
      completeModule={completeModule}
      enrolled={enrolled}
      isModuleFree={isModuleFree}
      freeModuleCount={freeModuleCount}
      pricing={pricing}
      previewVideoUrl={videoUrl}
    />
  );
};

export default ToolJourney;
