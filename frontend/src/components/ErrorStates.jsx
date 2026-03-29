import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

// Error Boundary class component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay 
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Error display component
export const ErrorDisplay = ({ 
  error, 
  title = "Oops! Something went wrong", 
  message = "Don't worry, it's not you - it's us. Try refreshing the page.",
  onRetry 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-[60vh] flex items-center justify-center p-6"
  >
    <div className="text-center max-w-md">
      <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-3">{title}</h2>
      <p className="text-slate-600 mb-6">{message}</p>
      
      {error?.message && (
        <div className="bg-slate-100 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 font-mono break-all">{error.message}</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        <Link to="/">
          <Button variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  </motion.div>
);

// 404 Not Found page
export const NotFound = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-[60vh] flex items-center justify-center p-6"
  >
    <div className="text-center max-w-md">
      <div className="text-8xl font-bold text-slate-200 mb-4">404</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h2>
      <p className="text-slate-600 mb-6">
        Looks like this page wandered off! Let's get you back on track.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/tools">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Explore AI Tools
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  </motion.div>
);

// Loading state
export const LoadingState = ({ message = "Loading..." }) => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-500">{message}</p>
    </div>
  </div>
);

// Empty state
export const EmptyState = ({ 
  icon: Icon = AlertTriangle,
  title = "Nothing here yet",
  message = "Check back later!",
  action
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-12"
  >
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm mb-4">{message}</p>
    {action}
  </motion.div>
);

export default ErrorBoundary;
