import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, BookOpen, CheckCircle2, Circle, 
  ChevronRight, Sparkles
} from 'lucide-react';
import { toolsData, getTotalModules, getTotalXP } from '../data/toolsData';
import { useProgress } from '../hooks/useProgress';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';

export const Curriculum = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const { isModuleCompleted, getOverallCompletion, totalXP } = useProgress();
  
  const totalModules = getTotalModules();
  const maxXP = getTotalXP();
  const overallCompletion = getOverallCompletion();

  const filteredTools = toolsData.filter(tool => {
    if (filterTool !== 'all' && tool.id !== filterTool) return false;
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.modules.some(m => 
        m.title.toLowerCase().includes(query) || 
        m.description.toLowerCase().includes(query)
      )
    );
  });

  const getFilteredModules = (tool) => {
    if (!searchQuery) return tool.modules;
    const query = searchQuery.toLowerCase();
    return tool.modules.filter(m => 
      m.title.toLowerCase().includes(query) || 
      m.description.toLowerCase().includes(query)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Full Curriculum
          </h1>
          <p className="text-slate-600 max-w-2xl text-lg">
            Browse all modules across every tool. Track your progress and find specific topics.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="card-professional text-center py-4">
              <div className="text-3xl font-bold text-primary">{toolsData.length}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">AI Tools</div>
            </div>
            <div className="card-professional text-center py-4">
              <div className="text-3xl font-bold text-primary">{totalModules}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Total Modules</div>
            </div>
            <div className="card-professional text-center py-4">
              <div className="text-3xl font-bold text-primary">{overallCompletion}%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Completed</div>
            </div>
            <div className="card-professional text-center py-4">
              <div className="text-3xl font-bold text-primary">{totalXP}/{maxXP}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">XP Earned</div>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="pl-12 h-12 rounded-xl border-slate-200 bg-white"
              data-testid="curriculum-search"
            />
          </div>
          
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
            data-testid="curriculum-filter"
          >
            <option value="all">All Tools</option>
            {toolsData.map(tool => (
              <option key={tool.id} value={tool.id}>{tool.name}</option>
            ))}
          </select>
        </motion.div>

        {/* Curriculum List */}
        <div className="space-y-6" data-testid="curriculum-list">
          {filteredTools.map((tool, toolIndex) => {
            const filteredModules = getFilteredModules(tool);
            if (filteredModules.length === 0) return null;
            
            const completedCount = tool.modules.filter(m => isModuleCompleted(tool.id, m.id)).length;
            const toolProgress = Math.round((completedCount / tool.modules.length) * 100);
            
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: toolIndex * 0.1 }}
                className="card-professional"
              >
                {/* Tool Header */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${tool.color}15` }}
                  >
                    {tool.icon}
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-lg font-semibold text-slate-900">{tool.name}</h2>
                    <p className="text-sm text-slate-500">{tool.tagline}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-primary">
                      {completedCount}/{tool.modules.length} modules
                    </div>
                    <div className="w-24 mt-2">
                      <Progress value={toolProgress} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Modules List */}
                <div className="space-y-2">
                  {filteredModules.map((module) => {
                    const completed = isModuleCompleted(tool.id, module.id);
                    
                    return (
                      <Link
                        key={module.id}
                        to={`/tools/${tool.id}`}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-slate-50 ${
                          completed ? 'bg-emerald-50/50' : ''
                        }`}
                        data-testid={`curriculum-module-${module.id}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate flex items-center gap-2">
                            {module.title}
                            {module.isAdvanced && (
                              <Sparkles className="w-3 h-3 text-amber-500" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {module.description}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="hidden sm:inline">{module.quiz.length} questions</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredTools.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No modules found</h3>
            <p className="text-slate-500">Try a different search term or filter</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Curriculum;
