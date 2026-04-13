import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search, BookOpen, CheckCircle2, Circle,
  ChevronRight, Sparkles, Mic, Brain, CreditCard
} from 'lucide-react';
import { useCurriculum } from '../hooks/useCurriculum';
import { useCategories } from '../hooks/useCategories';
import { useProgress } from '../hooks/useProgress';
import { usePricing } from '../hooks/useSiteConfig';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';

export const Curriculum = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const { isModuleCompleted, getOverallCompletion, totalXP } = useProgress();
  const { tools, isLoading, error } = useCurriculum();
  const { categories: apiCategories } = useCategories();
  const { getPlan } = usePricing();
  const aiPlan = getPlan('ai-learning');
  const englishPlan = getPlan('spoken-english');
  const aiPrice = aiPlan?.price ?? 199;
  const englishPrice = englishPlan?.price ?? 299;
  
  const totalModules = useMemo(
    () => tools.reduce((count, tool) => count + (tool.modules?.length || 0), 0),
    [tools]
  );

  const maxXP = useMemo(
    () => tools.reduce((count, tool) => count + (tool.totalXP || 0), 0),
    [tools]
  );

  const overallCompletion = getOverallCompletion();

  const filteredTools = tools.filter(tool => {
    if (filterTool !== 'all' && tool.id !== filterTool) return false;
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      (tool.modules || []).some(m => 
        m.title.toLowerCase().includes(query) || 
        (m.description || '').toLowerCase().includes(query)
      )
    );
  });

  const getFilteredModules = (tool) => {
    if (!searchQuery) return tool.modules || [];
    const query = searchQuery.toLowerCase();
    return (tool.modules || []).filter(m => 
      m.title.toLowerCase().includes(query) || 
      (m.description || '').toLowerCase().includes(query)
    );
  };

  const defaultCategories = [
    {
      id: 'ai-learning',
      name: 'AI Learning',
      description: 'All current curriculum content is organized here under AI learning.'
    },
    {
      id: 'spoken-writing-english',
      name: 'Spoken and Writing English',
      description: 'West Bengal-focused spoken and written English practice for teens, with stories, read-aloud practice, and quizzes.'
    }
  ];

  const effectiveCategories = apiCategories.length ? apiCategories : defaultCategories;

  const categorizedTools = effectiveCategories.map(category => ({
    ...category,
    tools: filteredTools.filter(tool => tool.category_id === category.id)
  }));

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
              <div className="text-3xl font-bold text-primary">{tools.length}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Curriculum Tools</div>
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
            {tools.map(tool => (
              <option key={tool.id} value={tool.id}>{tool.name}</option>
            ))}
          </select>
        </motion.div>

        {/* Curriculum List */}
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading curriculum content from MongoDB...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-6" data-testid="curriculum-list">
          {categorizedTools.map((category, categoryIndex) => (
            <div key={category.id}>
              <div className={`mb-5 p-5 rounded-2xl ${
                category.id === 'spoken-writing-english'
                  ? 'bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100'
                  : category.id === 'ai-learning'
                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100'
                    : 'bg-white border border-slate-100'
              }`}>
                <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
                  {category.id === 'spoken-writing-english' ? (
                    <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                      <Mic className="w-5 h-5 text-rose-600" />
                    </div>
                  ) : category.id === 'ai-learning' ? (
                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-indigo-600" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  {category.name}
                  {category.id === 'spoken-writing-english' && (
                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">NEW</span>
                  )}
                  {category.id === 'ai-learning' && (
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">5 TOOLS</span>
                  )}
                </h2>
                <div className="flex items-center justify-between mt-2 ml-12">
                  <p className="text-sm text-slate-500">
                    {category.description}
                  </p>
                  {category.id === 'ai-learning' && (
                    <a href="#payment-ai" className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-colors flex-shrink-0 ml-4">
                      <CreditCard className="w-3 h-3" />
                      Enroll &#8377;{aiPrice}
                    </a>
                  )}
                  {category.id === 'spoken-writing-english' && (
                    <a href="#payment-english" className="flex items-center gap-1.5 bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-rose-600 transition-colors flex-shrink-0 ml-4">
                      <CreditCard className="w-3 h-3" />
                      Enroll &#8377;{englishPrice}
                    </a>
                  )}
                </div>
              </div>

              {category.tools.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
                  No current modules are available in this category yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {category.tools.map((tool, toolIndex) => {
                    const filteredModules = getFilteredModules(tool);
                    if (filteredModules.length === 0) return null;

                    const completedCount = tool.modules.filter(m => isModuleCompleted(tool.id, m.id)).length;
                    const toolProgress = Math.round((completedCount / tool.modules.length) * 100);

                    return (
                      <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (categoryIndex * 0.1) + (toolIndex * 0.05) }}
                        className="card-professional"
                      >
                        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: `${tool.color}15` }}
                          >
                            {tool.icon}
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-slate-900">{tool.name}</h3>
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
                                  <span className="hidden sm:inline">{Array.isArray(module.quiz) ? module.quiz.length : (module.quiz?.questions?.length || 0)} questions</span>
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
              )}
            </div>
          ))}
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
