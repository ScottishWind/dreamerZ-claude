import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SafetyBanner = ({ variant = 'default' }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const messages = {
    default: "Don't share personal info. Verify important facts. Ask a trusted adult if unsure.",
    promptLab: "This is a learning space. Don't share personal info. Always verify AI responses.",
    journey: "Learning is fun! Remember: verify facts, don't share personal info, ask adults if unsure."
  };

  const message = messages[variant] || messages.default;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 border-b border-primary/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 gap-4">
            <div className="flex items-center gap-3 flex-grow">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide hidden sm:inline">
                  Safety Note
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {message}
                <Link 
                  to="/parents" 
                  className="ml-2 text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  <span className="hidden sm:inline">Learn more</span>
                </Link>
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-slate-200/50 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss safety note"
              data-testid="safety-banner-dismiss"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SafetyBanner;
