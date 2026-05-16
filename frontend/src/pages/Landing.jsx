import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, Shield, Users, Clock, Lock,
  Play, ChevronRight, ArrowRight, Sparkles, X,
  TrendingUp, BookOpen, CheckCircle2, Award,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useCurriculum } from '../hooks/useCurriculum';
import { useLandingStats } from '../hooks/useLandingStats';
import { useAuth } from '../hooks/useAuth';
import { CourseCard } from '../components/CourseCard';

/* ── Display helpers ─────────────────────────────────── */

const fmtCount = (n) => {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
};

const fmtRelativeTime = (iso) => {
  if (!iso) return '';
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    return `${Math.floor(diff / 86400)} d ago`;
  } catch { return ''; }
};

/* Tiny SVG sparkline — no chart lib dependency. */
const Sparkline = ({ data, color = '#fff', height = 28, width = 160 }) => {
  if (!data || !data.length) return null;
  const counts = data.map((d) => d.count || 0);
  const max = Math.max(...counts, 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = counts
    .map((c, i) => `${i * step},${height - (c / max) * (height - 2) - 1}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="opacity-70" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
};

/* ── Component ───────────────────────────────────────── */

export const Landing = () => {
  const { faqs: apiFaqs } = useSiteConfig();
  const { tools: apiTools } = useCurriculum();
  const { stats } = useLandingStats();
  const { isAuthenticated } = useAuth();

  // Cap FAQ to keep the page tight. Admin can manage order/visibility
  // via the existing faqs JSON seed; we just show the first 5.
  const faqs = useMemo(
    () => (apiFaqs || []).slice(0, 5).map((f) => ({ q: f.question, a: f.answer })),
    [apiFaqs],
  );

  // Prefer top-by-enrollment courses from /landing-stats. If the endpoint
  // hasn't responded yet (or fails) fall back to the first 6 published
  // courses surfaced by useCurriculum so the section always renders.
  const topCourses = useMemo(() => {
    if (stats.top_courses && stats.top_courses.length) {
      return stats.top_courses
        .map((tc) => {
          const enrich = apiTools.find((t) => t.id === tc.id);
          return enrich ? { ...enrich, enrollments: tc.enrollments } : null;
        })
        .filter(Boolean)
        .slice(0, 6);
    }
    return apiTools.slice(0, 6);
  }, [stats.top_courses, apiTools]);

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
        title="Learn AI & Conversational English — DreamerZ"
        description="Free AI and Conversational English courses for Bengali teenagers. Real lessons, real progress tracking, no payments ever."
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
                AI & English skills for{' '}
                <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Bengali teens
                </span>
              </h1>

              <p className="text-lg text-slate-300 mb-9 max-w-xl mx-auto leading-relaxed">
                Hands-on courses your school doesn't teach. Built for ages 13–18.
                Track progress, take quizzes, build real skills.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto sm:max-w-none">
                <Link to={isAuthenticated ? '/learn' : '/register'}>
                  <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-2" />
                    {isAuthenticated ? 'Go to Learning' : 'Start free'}
                  </Button>
                </Link>
                <Link to="/parents">
                  <Button className="bg-white/10 backdrop-blur text-white border border-white/20 font-medium px-8 py-3.5 rounded-full hover:bg-white/20 transition-all w-full sm:w-auto">
                    <Users className="w-4 h-4 mr-2" />
                    For parents
                  </Button>
                </Link>
              </div>

              {/* Live counter strip */}
              <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-400 px-5 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur">
                <span>
                  <strong className="text-white">{fmtCount(stats.learners)}</strong> learners
                </span>
                <span className="text-white/20">·</span>
                <span>
                  <strong className="text-white">{fmtCount(stats.lessons_completed)}</strong> lessons completed
                </span>
                <span className="text-white/20">·</span>
                <span className="text-emerald-300">100% Quality</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ━━━ LIVE IMPACT ━━━ */}
        <section className="py-14 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <Users className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{fmtCount(stats.learners)}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Active learners</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <BookOpen className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{fmtCount(stats.lessons_completed)}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Lessons completed</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <Clock className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{stats.avg_minutes_per_learner || 0}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Avg minutes / learner</div>
              </div>
            </div>

            {stats.registrations_last_30d && stats.registrations_last_30d.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-500">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {stats.registrations_last_30d.reduce((sum, d) => sum + (d.count || 0), 0)} new in the last 30 days
                </span>
                <Sparkline
                  data={stats.registrations_last_30d}
                  color="#10b981"
                  height={20}
                  width={120}
                />
                {stats.as_of && (
                  <span className="text-slate-400">· updated {fmtRelativeTime(stats.as_of)}</span>
                )}
              </div>
            )}
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
                  No social features, no random chat, no payments. Ever.
                </p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    'Per-learner progress dashboard with lesson-level detail',
                    'AI conversations stay on-topic and age-appropriate',
                    'No purchase prompts — the entire platform is free',
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
                Create your free account
              </h2>
              <p className="text-slate-400 mb-7 max-w-md mx-auto">
               Start your learning Journey Today. You can delete your data anytime.
              </p>
              <Link to={isAuthenticated ? '/learn' : '/register'}>
                <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all">
                  {isAuthenticated ? 'Go to Learning' : 'Start free →'}
                </Button>
              </Link>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Safe for ages 13+
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Built for Bengali teens
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
                  DreamerZ<span className="text-primary">_Beta</span>
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
                Start free
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
