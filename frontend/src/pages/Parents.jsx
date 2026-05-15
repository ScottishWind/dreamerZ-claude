import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Heart, Brain, Eye, MessageCircle,
  Clock, Users, BookOpen, AlertCircle, Check,
  ArrowRight, Lock, UserX, Phone, HelpCircle,
  FileWarning, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { ParentDashboard } from './ParentDashboard';

// What DreamerZ teaches
const whatWeTeach = [
  {
    title: 'AI Fundamentals',
    items: [
      'How Large Language Models (LLMs) work',
      'What tokens, context, and prompts mean',
      'Why AI sometimes "hallucinates" (makes stuff up)',
      'The difference between AI tools like ChatGPT, Claude, and Gemini'
    ]
  },
  {
    title: 'Prompt Engineering',
    items: [
      'Writing clear, specific prompts that get better answers',
      'Adding context and constraints for tailored responses',
      'The power of iteration - improving prompts step by step',
      'Using AI for creativity, learning, and problem-solving'
    ]
  },
  {
    title: 'Critical Thinking',
    items: [
      'Recognizing when AI might be wrong',
      'Fact-checking AI-generated information',
      'Understanding AI limitations and biases',
      'Knowing when to trust AI vs. ask a human expert'
    ]
  }
];

// Responsible AI use guidelines
const responsibleUse = [
  {
    icon: XCircle,
    title: "Don't Use AI to Cheat",
    description: "AI should help you learn, not do your homework for you. Use it to understand concepts, not copy answers. Your teachers can tell!",
    color: 'rose'
  },
  {
    icon: CheckCircle2,
    title: "Always Verify Facts",
    description: "AI can make things up that sound true. Always double-check important information from reliable sources like textbooks or trusted websites.",
    color: 'emerald'
  },
  {
    icon: FileWarning,
    title: "Cite Your Sources",
    description: "If you use AI to help with a project, be honest about it. Many schools have policies about AI use - follow them!",
    color: 'amber'
  },
  {
    icon: Brain,
    title: "Think for Yourself",
    description: "AI is a tool to enhance your thinking, not replace it. Form your own opinions and don't let AI make decisions for you.",
    color: 'violet'
  }
];

// Privacy promises
const privacyPromises = [
  {
    icon: Lock,
    title: 'No Sensitive Data Collection',
    description: "We never ask for phone numbers, home addresses, school names, Aadhaar numbers, or any personal identification."
  },
  {
    icon: UserX,
    title: 'No Direct Messages or Chat',
    description: "There's no DM feature, no social features, no way for strangers to contact your teen through our app."
  },
  {
    icon: Eye,
    title: 'Content Safety Filters',
    description: "All AI interactions pass through safety filters that block inappropriate content and personal info sharing."
  },
  {
    icon: Clock,
    title: 'Local Progress Storage',
    description: "Learning progress is stored locally on the device, not on servers. No cloud tracking of individual behavior."
  }
];

// Safety guidance
const safetyGuidance = [
  {
    situation: "If the AI says something that seems wrong or confusing",
    action: "Don't just accept it! Ask a parent, teacher, or search for the answer from a trusted source.",
    icon: '🤔'
  },
  {
    situation: "If you accidentally share personal information",
    action: "Tell a parent right away. It's okay - mistakes happen. We can help you stay safe.",
    icon: '😰'
  },
  {
    situation: "If the content makes you uncomfortable",
    action: "Close the app and talk to a trusted adult. Our safety filters should catch this, but if something slips through, please let us know.",
    icon: '😟'
  },
  {
    situation: "If someone asks you to use AI for something that feels wrong",
    action: "Trust your gut. Talk to a parent or teacher. Using AI to cheat, bully, or create harmful content is never okay.",
    icon: '🚨'
  }
];

// Helpline information
const helplines = [
  { name: 'Childline India', number: '1098', description: '24/7 support for children' },
  { name: 'iCall', number: '9152987821', description: 'Psychosocial helpline' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345', description: 'Mental health support' }
];

export const Parents = () => {
  const { isAuthenticated, isSupervisor, isCreator, isAdmin } = useAuth();

  const canAccessDashboard = isAuthenticated && (isSupervisor() || isCreator() || isAdmin());

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">For Parents & Educators</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Safe AI Learning for Your Teen
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            DreamerZ_Beta helps teenagers (ages 12-16) learn about AI responsibly.
            Here's everything you need to know about what we teach and how we keep them safe.
          </p>

          {canAccessDashboard && (
            <div className="mt-6">
              <Link to="/parentdashboard">
                <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30">
                  <Shield className="w-4 h-4 mr-2" />
                  Go to Parent Dashboard
                </Button>
              </Link>
            </div>
          )}
        </motion.div>

        {/* What We Teach */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            What DreamerZ_Beta Teaches
          </h2>
          
          <div className="grid gap-6">
            {whatWeTeach.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {category.title}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {category.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-sm text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Responsible AI Use */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Brain className="w-6 h-6 text-violet-600" />
            How to Use AI Responsibly
          </h2>
          <p className="text-slate-600 mb-6">We teach these principles throughout every lesson:</p>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {responsibleUse.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  item.color === 'rose' ? 'bg-rose-100' :
                  item.color === 'emerald' ? 'bg-emerald-100' :
                  item.color === 'amber' ? 'bg-amber-100' : 'bg-violet-100'
                }`}>
                  <item.icon className={`w-5 h-5 ${
                    item.color === 'rose' ? 'text-rose-600' :
                    item.color === 'emerald' ? 'text-emerald-600' :
                    item.color === 'amber' ? 'text-amber-600' : 'text-violet-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Privacy Promise */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-600" />
            Our Privacy Promise
          </h2>
          <p className="text-slate-600 mb-6">Your teen's safety is our top priority. Here's what we guarantee:</p>
          
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {privacyPromises.map((promise, index) => (
                <div key={promise.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <promise.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{promise.title}</h3>
                    <p className="text-sm text-slate-600">{promise.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* If Something Feels Unsafe */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-amber-600" />
            If Something Feels Unsafe
          </h2>
          <p className="text-slate-600 mb-6">We encourage teens to trust their instincts. Here's what to do:</p>
          
          <div className="space-y-4">
            {safetyGuidance.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">{item.situation}</p>
                    <p className="text-sm text-slate-600 flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {item.action}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Helplines */}
          <div className="mt-6 bg-blue-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900">Need to talk to someone?</h3>
                <p className="text-sm text-slate-600">These helplines are available for support:</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {helplines.map((helpline) => (
                <div key={helpline.name} className="bg-white rounded-xl p-4 text-center">
                  <p className="font-bold text-blue-600 text-lg">{helpline.number}</p>
                  <p className="font-medium text-slate-900 text-sm">{helpline.name}</p>
                  <p className="text-xs text-slate-500">{helpline.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Tips for Parents */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Heart className="w-6 h-6 text-rose-500" />
            Tips for Parents
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-2">🗣️ Have Open Conversations</h3>
              <p className="text-sm text-slate-600">Ask what they learned today. Discuss AI news together. Share your own questions about technology.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-2">⏰ Set Healthy Boundaries</h3>
              <p className="text-sm text-slate-600">While educational, balance is key. Use it as a guided activity, not passive screen time.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-2">🧪 Explore Together</h3>
              <p className="text-sm text-slate-600">Try the Prompt Lab together! It's a great way to learn alongside your child and bond.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-2">🎯 Reinforce Critical Thinking</h3>
              <p className="text-sm text-slate-600">Ask "How do you know that's true?" Encourage fact-checking. Celebrate healthy skepticism.</p>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-2xl p-8 border border-primary/20"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to Explore Together?</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Sit with your teen and try the Prompt Lab. It's a great way to start a conversation about AI and learn together!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/learn">
              <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30">
                Explore Courses
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/learn">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-xl font-semibold">
                <BookOpen className="w-4 h-4 mr-2" />
                See Our Courses
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Parents;
