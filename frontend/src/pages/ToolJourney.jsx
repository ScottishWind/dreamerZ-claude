import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getToolById } from '../data/toolsData';
import { useProgress } from '../hooks/useProgress';
import { JourneyPlayer } from '../components/JourneyPlayer';

export const ToolJourney = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const tool = getToolById(toolId);
  const { 
    isModuleCompleted, 
    isModuleUnlocked, 
    getModuleProgress,
    completeModule, 
    getToolCompletion 
  } = useProgress();

  useEffect(() => {
    if (!tool) {
      navigate('/tools');
    }
  }, [tool, navigate]);

  if (!tool) return null;

  return (
    <JourneyPlayer
      tool={tool}
      modules={tool.modules}
      isModuleCompleted={isModuleCompleted}
      isModuleUnlocked={isModuleUnlocked}
      getModuleProgress={getModuleProgress}
      completeModule={completeModule}
    />
  );
};

export default ToolJourney;
