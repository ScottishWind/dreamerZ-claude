import { Link } from 'react-router-dom';
import { Shield, BookOpen, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/home" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">
                DreamerZ<span className="text-primary">_Beta</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-md">
              Teaching Indian teenagers (ages 12-16) to use AI responsibly. 
              Learn prompt engineering, understand AI tools, and build future-ready skills.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/learn" className="hover:text-white transition-colors">
                  Explore Courses
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety */}
          <div>
            <h3 className="font-semibold text-white mb-4">Safety</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/parents" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                  data-testid="footer-parents-link"
                >
                  <Shield className="w-4 h-4 text-primary" />
                  For Parents
                </Link>
              </li>
              <li>
                <span className="text-slate-500 text-xs">
                  Safe learning environment
                </span>
              </li>
              <li>
                <span className="text-slate-500 text-xs">
                  No personal data collected
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} DreamerZ_Beta. Made with{' '}
            <Heart className="w-3 h-3 inline text-rose-500" /> for teen learners in India.
          </p>
          
          <div className="flex items-center gap-4 text-sm">
            <Link 
              to="/parents" 
              className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
            >
              <Shield className="w-4 h-4" />
              Safety & Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
