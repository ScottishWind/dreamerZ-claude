import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Brain, Shield, Lightbulb, 
  Target, Sparkles, GraduationCap, BookOpen,
  CheckCircle, Play, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';

const benefits = [
  {
    icon: Brain,
    title: 'Future-Ready Skills',
    description: 'Develop critical thinking and problem-solving abilities that prepare you for tomorrow\'s AI-powered world.'
  },
  {
    icon: Shield,
    title: 'Safe & Age-Appropriate',
    description: 'Learn in a secure environment with content filters and safety guidelines designed for teens.'
  },
  {
    icon: Lightbulb,
    title: 'Practical Knowledge',
    description: 'Master prompt engineering and AI tools you can use today for school projects and creativity.'
  },
  {
    icon: Target,
    title: 'Guided Learning Path',
    description: 'Progress through structured modules with quizzes to reinforce your understanding.'
  }
];

const tools = [
  { name: 'ChatGPT', modules: 7 },
  { name: 'Claude', modules: 3 },
  { name: 'Gemini', modules: 3 },
  { name: 'Canva', modules: 3 },
  { name: 'Syllaby', modules: 2 }
];

export const Landing = () => {
  return (
    <>
      <SEO 
        title="Learn AI Responsibly"
        description="DreamerZ_Beta teaches Indian teenagers (12-16) prompt engineering, AI tools like ChatGPT, Claude, and Gemini, and critical thinking skills in a safe learning environment."
      />
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pb-32 overflow-hidden bg-gradient-hero">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-sm font-semibold">Designed for Ages 12-16</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-6">
                Learn AI the
                <span className="text-primary"> Smart Way</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                India's premier AI learning platform for teenagers. Master ChatGPT, prompt engineering, and responsible AI use in a safe, engaging environment.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/tools" data-testid="hero-start-btn">
                  <Button className="btn-primary w-full sm:w-auto">
                    Start Learning Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/prompt-lab" data-testid="hero-prompt-lab-btn">
                  <Button className="btn-secondary w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-2" />
                    Try Prompt Lab
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 pt-8 border-t border-slate-200/60">
                <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                  <div className="text-center lg:text-left">
                    <div className="stat-number">5</div>
                    <div className="text-sm text-slate-500 font-medium">AI Tools</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="stat-number">20+</div>
                    <div className="text-sm text-slate-500 font-medium">Learning Modules</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="stat-number">100%</div>
                    <div className="text-sm text-slate-500 font-medium">Free Access</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/5212687/pexels-photo-5212687.jpeg"
                    alt="Student learning AI"
                    className="w-full h-[500px] object-cover"
                  />
                </div>
                
                {/* Floating card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-xl border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">AI-Powered Learning</div>
                      <div className="text-sm text-slate-500">Interactive & Engaging</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why Learn with DreamerZ?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We've designed every aspect of our platform with teenagers and parents in mind.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-professional text-center"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{benefit.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Preview */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Master the Tools <br />
                <span className="text-primary">Shaping the Future</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Learn how to use the most popular AI tools effectively and responsibly. Each tool includes comprehensive modules, hands-on activities, and quizzes.
              </p>

              <div className="space-y-4 mb-8">
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium text-slate-900">{tool.name}</span>
                    <span className="text-sm text-slate-500 ml-auto">{tool.modules} modules</span>
                  </motion.div>
                ))}
              </div>

              <Link to="/tools">
                <Button className="btn-primary">
                  Explore All Tools
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/4709284/pexels-photo-4709284.jpeg"
                  alt="Students coding together"
                  className="w-full h-[450px] object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Start Your AI Journey?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join thousands of Indian teenagers learning AI skills. No sign-up required — start exploring right now.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tools" data-testid="cta-start-btn">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 font-medium px-8 py-3 rounded-full transition-all">
                  Start Learning
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/parents">
                <Button className="bg-transparent text-white border border-white/30 hover:bg-white/10 font-medium px-8 py-3 rounded-full transition-all">
                  Parent Guide
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-semibold text-slate-900">DreamerZ<span className="text-primary">_Beta</span></span>
            </div>
            <p className="text-sm text-slate-500">
              Safe AI learning for Indian teenagers
            </p>
            <Link to="/parents" className="text-sm text-primary font-medium hover:underline">
              For Parents
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Landing;
