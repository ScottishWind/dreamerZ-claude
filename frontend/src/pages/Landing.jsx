import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, Shield, Users, Lock,
  Play, ChevronRight, Sparkles, X,
  BookOpen, CheckCircle2, Award,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useAuth } from '../hooks/useAuth';

/* ── Component ───────────────────────────────────────── */

export const Landing = () => {
  const { faqs: apiFaqs } = useSiteConfig();
  const { isAuthenticated } = useAuth();

  // Cap FAQ to keep the page tight. Admin can manage order/visibility
  // via the existing faqs JSON seed; we just show the first 5.
  const faqs = useMemo(
    () => (apiFaqs || []).slice(0, 5).map((f) => ({ q: f.question, a: f.answer })),
    [apiFaqs],
  );

  /* ── Mobile sticky CTA ── */
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const showStickyCta = scrolledPastHero && !stickyDismissed && !isAuthenticated;

  /* ── Render ── */

  return (
    <>
      <SEO
        title="Learn AI & Conversational English skills — DreamerZ_Lite"
        description="Hands-on AI and Conversational English courses with real lessons and progress tracking. Suitable for learners 11 years and above."
      />
      <div className="min-h-screen bg-white">

        {/* ━━━ HERO ━━━ */}
        <section className="relative pt-28 pb-14 lg:pt-32 lg:pb-20 bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full mb-6 text-xs font-semibold border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Structured High-quality Curated Courses
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-5 max-w-3xl mx-auto">
                Learn AI &{' '}
                <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Conversational English skills
                </span>
              </h1>

              <p className="text-lg text-slate-300 mb-9 max-w-xl mx-auto leading-relaxed">
                Hands-on courses your school doesn't teach. Suitable for learners 11 years and above.
                Track progress, take quizzes, build real skills.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto sm:max-w-none">
                <Link to={isAuthenticated ? '/learn' : '/register'}>
                  <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-2" />
                    {isAuthenticated ? 'Go to Learning' : 'Free trial for 45 days'}
                  </Button>
                </Link>
                <Link to="/parents">
                  <Button className="bg-white/10 backdrop-blur text-white border border-white/20 font-medium px-8 py-3.5 rounded-full hover:bg-white/20 transition-all w-full sm:w-auto">
                    <Users className="w-4 h-4 mr-2" />
                    For parents
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ━━━ TWO PROOF CARDS — learner + parent ━━━ */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Learner proof */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-slate-100 p-7 lg:p-8"
              >
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full mb-4 text-xs font-bold">
                  <Brain className="w-3.5 h-3.5" /> FOR LEARNERS
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Learn what your school doesn't teach</h3>
                <p className="text-slate-600 mb-5">
                  Real skills you can show off: write better ChatGPT prompts, spot when AI makes things up,
                  hold a 5-minute English conversation on demand.
                </p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    'Write your first AI prompt — and improve it iteratively',
                    'Spot AI hallucinations before you act on them',
                    'Practise conversational English with an AI roleplay partner',
                    'Earn XP and build a streak you can show your parents',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/learn/ai-learning/chatgpt" className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:text-primary/80">
                  See a sample lesson <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Parent proof */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 p-7 lg:p-8"
              >
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1 rounded-full mb-4 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5" /> FOR PARENTS
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">You stay in control</h3>
                <p className="text-slate-600 mb-5">
                  Track every quiz score. See exactly which lessons your child has finished.
                </p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    'Per-learner progress dashboard with lesson-level detail',
                    'AI conversations stay on-topic and age-appropriate',
                    'Delete your child\'s data any time, no questions asked',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/parents" className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:text-primary/80">
                  Open the parent dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ━━━ FAQ ━━━ */}
        {faqs.length > 0 && (
          <section className="py-14 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                Questions parents usually ask
              </h3>
              <p className="text-sm text-slate-500 text-center mb-8">
                Couldn't find an answer? <Link to="/parents" className="text-primary hover:underline">See the parent guide.</Link>
              </p>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <motion.details
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="group bg-slate-50 rounded-xl border border-slate-100 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 text-sm hover:bg-slate-100 transition-colors list-none">
                      {faq.q}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ━━━ FINAL CTA — single, calm ━━━ */}
        <section className="py-16 bg-slate-950">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Award className="w-10 h-10 text-amber-400 mx-auto mb-5" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Start your 45-day free trial
              </h2>
              <p className="text-slate-400 mb-7 max-w-md mx-auto">
                Start your learning journey today. You can delete your data anytime.
              </p>
              <Link to={isAuthenticated ? '/learn' : '/register'}>
                <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all">
                  {isAuthenticated ? 'Go to Learning' : 'Free trial for 45 days →'}
                </Button>
              </Link>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Safe for ages 11+
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Self-paced learning
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> No data sold, ever
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ━━━ FOOTER ━━━ */}
        <footer className="py-8 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-semibold text-slate-900">
                  DreamerZ<span className="text-primary">_Lite</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <Link to="/learn" className="hover:text-slate-700 transition-colors">Courses</Link>
                <Link to="/parents" className="hover:text-slate-700 transition-colors">For Parents</Link>
                <Link to="/login" className="hover:text-slate-700 transition-colors">Sign in</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ━━━ Mobile sticky CTA — only for non-authenticated, after scroll ━━━ */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-slate-200 p-3 shadow-2xl z-50">
          <div className="flex items-center gap-2">
            <Link to="/register" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold rounded-full">
                <Play className="w-4 h-4 mr-2" />
                Free trial for 45 days
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setStickyDismissed(true)}
              aria-label="Dismiss"
              className="p-2.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Landing;
