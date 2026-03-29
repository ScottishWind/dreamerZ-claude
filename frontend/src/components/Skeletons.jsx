import { motion } from 'framer-motion';

// Generic skeleton pulse animation
const pulseAnimation = {
  initial: { opacity: 0.5 },
  animate: { opacity: 1 },
  transition: { duration: 0.8, repeat: Infinity, repeatType: 'reverse' }
};

// Card skeleton for tool cards
export const CardSkeleton = () => (
  <motion.div
    {...pulseAnimation}
    className="bg-slate-100 rounded-2xl p-6 h-64"
  >
    <div className="w-16 h-16 bg-slate-200 rounded-xl mb-4" />
    <div className="h-6 bg-slate-200 rounded-lg w-3/4 mb-3" />
    <div className="h-4 bg-slate-200 rounded-lg w-full mb-2" />
    <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
    <div className="mt-6 h-10 bg-slate-200 rounded-xl w-full" />
  </motion.div>
);

// Module list skeleton
export const ModuleListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        {...pulseAnimation}
        className="bg-slate-100 rounded-xl p-4 flex items-center gap-4"
      >
        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
        <div className="flex-grow">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2" />
          <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
        </div>
      </motion.div>
    ))}
  </div>
);

// Content skeleton for journey player
export const ContentSkeleton = () => (
  <motion.div {...pulseAnimation} className="space-y-4">
    <div className="h-8 bg-slate-200 rounded-lg w-1/2" />
    <div className="space-y-2">
      <div className="h-4 bg-slate-200 rounded-lg w-full" />
      <div className="h-4 bg-slate-200 rounded-lg w-full" />
      <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
    </div>
    <div className="h-32 bg-slate-200 rounded-xl w-full" />
  </motion.div>
);

// Text line skeleton
export const TextSkeleton = ({ width = 'w-full', height = 'h-4' }) => (
  <motion.div
    {...pulseAnimation}
    className={`bg-slate-200 rounded-lg ${width} ${height}`}
  />
);

// Stats card skeleton
export const StatsSkeleton = () => (
  <motion.div
    {...pulseAnimation}
    className="bg-slate-100 rounded-2xl p-6"
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-200 rounded-xl" />
      <div>
        <div className="h-6 bg-slate-200 rounded-lg w-16 mb-2" />
        <div className="h-3 bg-slate-200 rounded-lg w-20" />
      </div>
    </div>
  </motion.div>
);

// Full page skeleton
export const PageSkeleton = () => (
  <div className="min-h-screen bg-slate-50 pt-24 pb-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="mb-12">
        <TextSkeleton width="w-1/3" height="h-10" />
        <div className="mt-3">
          <TextSkeleton width="w-2/3" height="h-5" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="grid md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  </div>
);

export default {
  CardSkeleton,
  ModuleListSkeleton,
  ContentSkeleton,
  TextSkeleton,
  StatsSkeleton,
  PageSkeleton
};
