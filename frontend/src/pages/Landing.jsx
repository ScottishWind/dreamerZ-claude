import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, Shield,
  Target, GraduationCap, BookOpen,
  CheckCircle, Play, ChevronRight, Mic, Languages, MessageCircle,
  Zap, Star, Users, Clock, Award
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useSiteConfig } from '../hooks/useSiteConfig';

/* ── Icon lookup (maps DB string → component) ────────── */
const ICON_MAP = { Brain, Shield, Target, GraduationCap, BookOpen, Mic, Languages, MessageCircle, Users, Clock, Award, Star, CheckCircle };
const getIcon = (name) => ICON_MAP[name] || BookOpen;

/* ── Course info for display ── */
const COURSES = [
  {
    id: 'ai-learning',
    name: 'AI Learning',
    tagline: 'Master AI tools with hands-on modules',
    emoji: '🤖',
    gradient: 'from-indigo-600 to-violet-600',
    coursePath: '/learn'
  },
  {
    id: 'spoken-english',
    name: 'Spoken English',
    tagline: '30-day course built for Bengali teens',
    emoji: '🗣️',
    gradient: 'from-rose-500 to-pink-500',
    coursePath: '/learn/spoken-english-30day'
  }
];

/* ── Component ────────────────────────────────────────── */

export const Landing = () => {
  const {
    faqs: apiFaqs, trustPoints: apiTrustPoints,
    benefits: apiBenefits, stats: apiStats, aiTools: apiAiTools,
    englishWeeks: apiEnglishWeeks, isLoading
  } = useSiteConfig();

  const trustPoints = apiTrustPoints.length ? apiTrustPoints : [];
  const aiToolsList = apiAiTools.length ? apiAiTools : [];
  const englishWeeks = apiEnglishWeeks.length ? apiEnglishWeeks : [];
  const faqs = apiFaqs.length ? apiFaqs.map(f => ({ q: f.question, a: f.answer })) : [];
  const benefits = apiBenefits.length ? apiBenefits : [];
  const stats = apiStats.length ? apiStats : [];

  return (
    <>
      <SEO
        title="Learn AI & Spoken English — DreamerZ"
        description="India's #1 free learning platform for Bengali teenagers. Master ChatGPT, Claude, Gemini + 30-day spoken English course. 100% free access."
      />
      <div className="min-h-screen bg-white">

      {/* ━━━ HERO — Short, punchy, pricing-anchored ━━━ */}
      <section className="relative pt-28 pb-16 lg:pt-32 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white px-4 py-2 rounded-full mb-6 border border-white/10">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">Trusted by Bengali teens across West Bengal</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5">
                Learn AI & English<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">100% Free for Everyone</span>
              </h1>

              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
                Master ChatGPT, Claude, Gemini + a 30-day spoken English course. Built for Bengali teenagers. Completely free, no payments needed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Link to="/learn">
                  <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all text-base w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-2" />
                    Start Learning Now
                  </Button>
                </Link>
                <Link to="/parents">
                  <Button className="bg-white/10 backdrop-blur text-white border border-white/20 font-medium px-8 py-3.5 rounded-full hover:bg-white/20 transition-all text-base w-full sm:w-auto">
                    <Users className="w-4 h-4 mr-2" />
                    For Parents
                  </Button>
                </Link>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {trustPoints.map((tp) => {
                  const TpIcon = getIcon(tp.icon);
                  return (
                    <div key={tp.text || tp.id} className="flex items-center gap-1.5 text-sm text-slate-400">
                      <TpIcon className={`w-4 h-4 ${tp.color}`} />
                      <span>{tp.text}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Mini course cards floating below hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid sm:grid-cols-2 gap-4 mt-12 max-w-3xl mx-auto"
          >
            {COURSES.map((course) => (
              <Link key={course.id} to={course.coursePath} className="block group">
                <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{course.emoji}</span>
                    <div>
                      <div className="font-bold text-white text-lg">{course.name}</div>
                      <div className="text-xs text-slate-400">{course.tagline}</div>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-emerald-400 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full">FREE</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 group-hover:text-amber-300 transition-colors">
                    <span>Start learning now</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━ WHAT YOU GET — Quick course breakdowns ━━━ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* AI Learning breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="lg:w-1/3">
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full mb-3">
                  <Brain className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">COURSE 1</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                  AI Learning
                  <span className="text-emerald-600"> — Free</span>
                </h2>
                <p className="text-slate-600 mb-4">
                  Learn real-world AI tools through hands-on modules. From writing your first ChatGPT prompt to creating designs in Canva with AI.
                </p>
                <Link to="/learn">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Start Learning
                  </Button>
                </Link>
              </div>
              <div className="lg:w-2/3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {aiToolsList.map((tool, i) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4"
                  >
                    <div className="font-semibold text-slate-900">{tool.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{tool.description}</div>
                    <div className="text-xs font-medium text-indigo-600 mt-2">{tool.modules} modules</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="border-t border-slate-100" />

          {/* Spoken English breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16"
          >
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="lg:w-1/3">
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full mb-3">
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">COURSE 2</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                  Spoken English
                  <span className="text-emerald-600"> — Free</span>
                </h2>
                <p className="text-slate-600 mb-2">
                  A Duolingo-style 30-day course built for West Bengal students. Dialogues, AI roleplay, vocabulary with Bengali meanings, and weekly tests.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><Mic className="w-3 h-3" />AI Roleplay</span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><Languages className="w-3 h-3" />Bengali Tips</span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><MessageCircle className="w-3 h-3" />Real Dialogues</span>
                </div>
                <Link to="/learn/spoken-english-30day">
                  <Button className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Start Learning
                  </Button>
                </Link>
              </div>
              <div className="lg:w-2/3 grid sm:grid-cols-2 gap-3">
                {englishWeeks.map((w, i) => (
                  <motion.div
                    key={w.week}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{w.week}</span>
                      <span className="font-semibold text-slate-900 text-sm">{w.title}</span>
                    </div>
                    <div className="text-xs text-slate-500">{w.topics}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ━━━ SOCIAL PROOF STRIP ━━━ */}
      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.id || stat.label}>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FREE ACCESS BANNER ━━━ */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 lg:p-8 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Everything is Free. No Catch.
            </h2>
            <p className="text-emerald-50 max-w-lg mx-auto mb-6">
              All courses, all modules, all features. Register and start learning right away.
            </p>
            <Link to="/learn">
              <Button className="bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all text-base">
                <Play className="w-4 h-4 mr-2" />
                Start Learning Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ━━━ WHY DREAMERZ — Compact benefits ━━━ */}
      <section className="py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-8">Why parents and teens choose DreamerZ</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b) => {
              const BIcon = getIcon(b.icon);
              const colorParts = (b.color || 'text-slate-600 bg-slate-50').split(' ');
              return (
                <motion.div
                  key={b.id || b.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl border border-slate-100 p-5"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorParts[1] || 'bg-slate-50'}`}>
                    <BIcon className={`w-5 h-5 ${colorParts[0] || 'text-slate-600'}`} />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">{b.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{b.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group bg-slate-50 rounded-xl border border-slate-100 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━ */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Start learning today — your future self will thank you
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Two courses. Completely free. Built with love for Bengali teenagers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/learn">
                <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                  <Play className="w-4 h-4 mr-2" />
                  Start Learning
                </Button>
              </Link>
              <Link to="/parents">
                <Button className="bg-white/10 text-white border border-white/20 font-medium px-8 py-3.5 rounded-full hover:bg-white/20 transition-all w-full sm:w-auto">
                  Parent Guide
                </Button>
              </Link>
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
              <span className="font-semibold text-slate-900">DreamerZ<span className="text-primary">_Beta</span></span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <Link to="/learn" className="hover:text-slate-700 transition-colors">Courses</Link>
              <Link to="/parents" className="hover:text-slate-700 transition-colors">For Parents</Link>
            </div>
            <p className="text-sm text-slate-400">
              AI & English learning for Indian teenagers
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Landing;
