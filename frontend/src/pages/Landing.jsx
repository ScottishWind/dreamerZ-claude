import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Brain, Shield,
  Target, GraduationCap, BookOpen,
  CheckCircle, Play, ChevronRight, Mic, Languages, MessageCircle,
  CreditCard, Zap, Crown, Star, Users, Clock, Award
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useSiteConfig } from '../hooks/useSiteConfig';

/* ── Icon lookup (maps DB string → component) ────────── */
const ICON_MAP = { Brain, Shield, Target, GraduationCap, BookOpen, Mic, Languages, MessageCircle, Users, Clock, Award, Star, CheckCircle };
const getIcon = (name) => ICON_MAP[name] || BookOpen;

/* ── Static fallback while API loads (never the source of truth) */
const FALLBACK_PLANS = [
  {
    id: 'ai-learning',
    name: 'AI Learning',
    tagline: 'Master 5 AI tools with hands-on modules',
    price: 199,
    originalPrice: 499,
    icon: Brain,
    emoji: '🤖',
    color: 'indigo',
    gradient: 'from-indigo-600 to-violet-600',
    lightBg: 'from-indigo-50 to-violet-50',
    badge: '5 Tools',
    highlights: ['ChatGPT, Claude, Gemini, Canva, Syllaby', '18+ interactive modules', 'Prompt engineering mastery', 'Quizzes & XP tracking', 'Lifetime access'],
    cta: 'Enroll Now — ₹199',
    link: '#payment-ai',
    coursePath: '/learn'
  },
  {
    id: 'spoken-english',
    name: 'Spoken English',
    tagline: '30-day course built for Bengali teens',
    price: 299,
    originalPrice: 799,
    icon: Mic,
    emoji: '🗣️',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-500',
    lightBg: 'from-rose-50 to-pink-50',
    badge: '30 Days',
    popular: true,
    highlights: ['30 structured daily lessons', 'AI roleplay with 5 characters', 'Vocab with Bengali meanings', 'Daily dialogues & speaking tasks', 'Weekly tests & progress tracking'],
    cta: 'Enroll Now — ₹299',
    link: '#payment-english',
    coursePath: '/learn/spoken-english-30day'
  }
];

/* ── Component ────────────────────────────────────────── */

export const Landing = () => {
  const {
    pricingPlans: apiPlans, faqs: apiFaqs, trustPoints: apiTrustPoints,
    benefits: apiBenefits, stats: apiStats, aiTools: apiAiTools,
    englishWeeks: apiEnglishWeeks, bundlePaymentLink, isLoading
  } = useSiteConfig();

  // Use API data when loaded, fallback to static for instant render
  const pricingPlans = apiPlans.length ? apiPlans.map(p => ({
    ...p, originalPrice: p.original_price, lightBg: p.light_bg,
    link: p.payment_link, coursePath: p.course_path
  })) : FALLBACK_PLANS;
  const aiPlan = pricingPlans.find(p => p.id === 'ai-learning') || pricingPlans[0];
  const englishPlan = pricingPlans.find(p => p.id === 'spoken-english') || pricingPlans[1];
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
        description="India's #1 learning platform for Bengali teenagers. Master ChatGPT, Claude, Gemini + 30-day spoken English course. Starting at ₹199. Lifetime access."
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
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Starting at just ₹{aiPlan?.price || 199}</span>
              </h1>

              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
                Master ChatGPT, Claude, Gemini + a 30-day spoken English course. Built for Bengali teenagers. One-time payment, lifetime access.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <a href="#pricing">
                  <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all text-base w-full sm:w-auto">
                    <CreditCard className="w-4 h-4 mr-2" />
                    View Pricing & Enroll
                  </Button>
                </a>
                <Link to="/learn">
                  <Button className="bg-white/10 backdrop-blur text-white border border-white/20 font-medium px-8 py-3.5 rounded-full hover:bg-white/20 transition-all text-base w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-2" />
                    Preview Free
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
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <a key={plan.id} href="#pricing" className="block group">
                  <div className={`bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-all ${plan.popular ? 'ring-2 ring-amber-400/50' : ''}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{plan.emoji}</span>
                      <div>
                        <div className="font-bold text-white text-lg">{plan.name}</div>
                        <div className="text-xs text-slate-400">{plan.tagline}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-xs text-slate-500 line-through">₹{plan.originalPrice}</div>
                        <div className="text-lg font-bold text-amber-400">₹{plan.price}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-300 group-hover:text-amber-300 transition-colors">
                      <span>See what's included</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </a>
              );
            })}
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
                  <span className="text-indigo-600"> — ₹{aiPlan?.price || 199}</span>
                </h2>
                <p className="text-slate-600 mb-4">
                  Learn 5 real-world AI tools through hands-on modules. From writing your first ChatGPT prompt to creating designs in Canva with AI.
                </p>
                <a href="#payment-ai">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Enroll — ₹{aiPlan?.price || 199}
                  </Button>
                </a>
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
                  <span className="text-rose-500"> — ₹{englishPlan?.price || 299}</span>
                </h2>
                <p className="text-slate-600 mb-2">
                  A Duolingo-style 30-day course built for West Bengal students. Dialogues, AI roleplay, vocabulary with Bengali meanings, and weekly tests.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><Mic className="w-3 h-3" />AI Roleplay</span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><Languages className="w-3 h-3" />Bengali Tips</span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2 py-1 rounded-full"><MessageCircle className="w-3 h-3" />Real Dialogues</span>
                </div>
                <a href="#payment-english">
                  <Button className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Enroll — ₹{englishPlan?.price || 299}
                  </Button>
                </a>
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

      {/* ━━━ PRICING — Central focus ━━━ */}
      <section id="pricing" className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-full mb-4">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-semibold">Limited-time launch pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Pick Your Course. Start Today.
            </h2>
            <p className="text-slate-600 max-w-lg mx-auto">
              One-time payment. Lifetime access. No subscriptions or hidden charges.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
            {pricingPlans.map((plan, index) => {
              const Icon = plan.icon;
              const discount = Math.round((1 - plan.price / plan.originalPrice) * 100);
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-white rounded-3xl border-2 ${plan.popular ? 'border-rose-300 shadow-xl shadow-rose-100/40' : 'border-slate-200 shadow-lg'} overflow-hidden`}
                >
                  {/* Top ribbon */}
                  <div className={`bg-gradient-to-r ${plan.gradient} px-6 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{plan.emoji}</span>
                      <span className="font-bold text-white text-lg">{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.popular && (
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> POPULAR
                        </span>
                      )}
                      <span className="bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                        {discount}% OFF
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-slate-900">₹{plan.price}</span>
                      <span className="text-lg text-slate-400 line-through">₹{plan.originalPrice}</span>
                    </div>
                    <div className="text-sm text-slate-500 mb-5">One-time payment &bull; Lifetime access</div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6">
                      {plan.highlights.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <CheckCircle className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${plan.color === 'indigo' ? 'text-indigo-500' : 'text-rose-500'}`} />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <a href={plan.link} className="block">
                      <Button className={`w-full bg-gradient-to-r ${plan.gradient} text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base`}>
                        <Zap className="w-4 h-4" />
                        {plan.cta}
                      </Button>
                    </a>

                    {/* Preview link */}
                    <Link to={plan.coursePath} className="block mt-3 text-center">
                      <span className={`text-sm font-medium ${plan.color === 'indigo' ? 'text-indigo-600 hover:text-indigo-700' : 'text-rose-600 hover:text-rose-700'} transition-colors`}>
                        Preview course for free →
                      </span>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bundle banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 lg:p-8 text-center max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <div>
                <div className="flex items-center gap-2 justify-center mb-1">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-white text-lg">Get Both Courses</span>
                </div>
                <div className="text-slate-400 text-sm">AI Learning + Spoken English — complete package</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-500 line-through">₹{pricingPlans[0].originalPrice + pricingPlans[1].originalPrice}</span>
                <span className="text-3xl font-bold text-amber-400">₹{pricingPlans[0].price + pricingPlans[1].price}</span>
              </div>
              <a href="#payment-bundle">
                <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all">
                  Enroll in Both
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </a>
            </div>
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
              Two courses. One-time payment. Lifetime access. Built with love for Bengali teenagers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#pricing">
                <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Enroll Now
                </Button>
              </a>
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
              <a href="#pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
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
