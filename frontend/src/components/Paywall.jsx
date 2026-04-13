import { motion } from 'framer-motion';
import { Lock, CreditCard, CheckCircle, Play, Shield, Zap } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Paywall overlay shown when a user tries to access a locked module.
 * Displays pricing, highlights, and a CTA to pay.
 *
 * Props:
 *  - pricing: plan object from API { name, price, original_price, highlights, payment_link, ... }
 *  - moduleName: name of the module being accessed
 *  - freeModuleCount: how many modules are free
 *  - totalModules: total modules in this tool
 *  - onClose: callback to dismiss
 */
export const Paywall = ({ pricing, moduleName, freeModuleCount, totalModules, onClose }) => {
  if (!pricing) return null;

  const discount = Math.round((1 - pricing.price / pricing.original_price) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${pricing.gradient || 'from-indigo-600 to-violet-600'} p-6 text-center relative`}>
          <div className="absolute top-3 right-3">
            <span className="bg-amber-400 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full">
              {discount}% OFF
            </span>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            Unlock Full Course
          </h2>
          <p className="text-white/80 text-sm">
            You've completed {freeModuleCount} free modules. Enroll to access all {totalModules} modules.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Price */}
          <div className="text-center mb-5">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-slate-900">₹{pricing.price}</span>
              <span className="text-lg text-slate-400 line-through">₹{pricing.original_price}</span>
            </div>
            <div className="text-sm text-slate-500 mt-1">One-time payment · Lifetime access</div>
          </div>

          {/* Highlights */}
          <div className="space-y-2.5 mb-6">
            {(pricing.highlights || []).slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a href={pricing.payment_link || '#payment'} className="block">
            <Button className={`w-full bg-gradient-to-r ${pricing.gradient || 'from-indigo-600 to-violet-600'} text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base`}>
              <CreditCard className="w-5 h-5" />
              {pricing.cta || `Enroll Now — ₹${pricing.price}`}
            </Button>
          </a>

          {/* Trust */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Safe & Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant Access</span>
          </div>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="w-full text-center mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Continue with free preview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Inline paywall banner shown inside the module sidebar for locked modules.
 */
export const PaywallBanner = ({ pricing, freeModuleCount }) => {
  if (!pricing) return null;

  return (
    <div className="mx-2 my-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-bold text-amber-800">Premium Content</span>
      </div>
      <p className="text-xs text-amber-700 mb-2">
        First {freeModuleCount} modules are free. Enroll to unlock everything.
      </p>
      <a href={pricing.payment_link || '#payment'}>
        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold py-2 rounded-lg">
          <CreditCard className="w-3 h-3 mr-1" />
          Enroll — ₹{pricing.price}
        </Button>
      </a>
    </div>
  );
};

export default Paywall;
