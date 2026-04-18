import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap, BookOpen } from 'lucide-react';
import { Progress } from './ui/progress';

export const ToolCard = ({ tool, index, completion = 0, linkPrefix = '/learn' }) => {
  const difficultyClass = {
    'Beginner': 'badge-beginner',
    'Intermediate': 'badge-intermediate',
    'Advanced': 'badge-advanced'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.4
      }}
      className="group"
    >
      <Link 
        to={`${linkPrefix}/${tool.id}`}
        data-testid={`tool-card-${tool.id}`}
        className="block h-full"
      >
        <div className="card-professional h-full flex flex-col hover:border-primary/20 hover:shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${tool.color}15` }}
            >
              {tool.icon}
            </div>
            <span className={`badge ${difficultyClass[tool.difficulty]}`}>
              {tool.difficulty}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-slate-500 mb-2">{tool.tagline}</p>
          <p className="text-sm text-slate-600 mb-5 flex-grow line-clamp-2 leading-relaxed">
            {tool.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{tool.modules.length} modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{tool.xpReward} XP</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Progress</span>
              <span className="font-semibold text-primary">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <span className="text-sm font-medium text-primary">
              {completion === 0 ? 'Start Learning' : completion === 100 ? 'Review' : 'Continue'}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 text-primary group-hover:text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ToolCard;
