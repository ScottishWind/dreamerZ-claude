import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle2, Mail, CalendarDays, Clock3, MapPin, Phone, FileText,
  Download, Upload, RotateCcw, Check, AlertTriangle, FileJson, Info, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { toast } from 'sonner';

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
};

export const Account = () => {
  const { user, isAuthenticated, isLoaded: authLoaded, updateProfile } = useAuth();
  const { progress, resetProgress, isLoaded: progressLoaded } = useProgress();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: ''
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || ''
    });
  }, [user]);

  if (authLoaded && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!authLoaded || !user || !progressLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

  // Profile handlers
  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateProfile(formData);
    toast.success('Profile updated successfully.');
  };

  // Data & Progress handlers
  const handleExportProgress = () => {
    try {
      const dataStr = JSON.stringify(progress, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `dreamerz_progress_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('Progress exported successfully!');
    } catch (error) {
      toast.error('Failed to export progress');
      console.error('Export error:', error);
    }
  };

  const handleImportProgress = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result);
        if (!importedData.version || !importedData.completedModules) {
          throw new Error('Invalid progress file format');
        }
        localStorage.setItem('dreamerz_beta_progress_v1', JSON.stringify(importedData));
        setImportStatus('success');
        toast.success('Progress imported! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        setImportStatus('error');
        toast.error('Invalid progress file. Please check the format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfirm = () => {
    resetProgress();
    setShowResetConfirm(false);
    toast.success('Progress reset successfully!');
  };

  const totalModules = Object.values(progress.completedModules || {}).reduce(
    (acc, tool) => acc + Object.keys(tool).length, 0
  );

  return (
    <>
      <SEO title="My Account" description="Manage your DreamerZ profile and learning data." />
      <div className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* User header card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCircle2 className="w-9 h-9" />
              </div>
              <div className="flex-grow">
                <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
                <p className="text-sm text-slate-500">@{user.username}</p>
              </div>
              <div className="hidden sm:flex flex-col text-right text-sm text-slate-500 gap-1">
                <div className="flex items-center gap-2 justify-end">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user.email}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Clock3 className="w-4 h-4 text-slate-400" />
                  Last login: {formatDateTime(user.lastLoginAt)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tab Buttons */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeTab === 'data'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Data & Progress
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Profile details</h2>
                    <p className="text-slate-600 mt-2">Keep your personal details up to date.</p>
                  </div>

                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <label className="block text-sm font-medium text-slate-700">
                        First name
                        <input
                          value={formData.firstName}
                          onChange={handleChange('firstName')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="First name"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Last name
                        <input
                          value={formData.lastName}
                          onChange={handleChange('lastName')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="Last name"
                        />
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                      Email address
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none cursor-not-allowed"
                        placeholder="email@example.com"
                      />
                    </label>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <label className="block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          Phone
                        </span>
                        <input
                          value={formData.phone}
                          onChange={handleChange('phone')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="Phone number"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          Location
                        </span>
                        <input
                          value={formData.location}
                          onChange={handleChange('location')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="City, State"
                        />
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Bio
                      </span>
                      <textarea
                        value={formData.bio}
                        onChange={handleChange('bio')}
                        rows={5}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Tell us a bit about yourself"
                      />
                    </label>

                    <div className="flex justify-end">
                      <Button type="submit">Save profile</Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Current Progress Summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Current Progress Summary
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-primary">{totalModules}</div>
                      <div className="text-xs text-slate-500">Modules Done</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{progress.totalXP || 0}</div>
                      <div className="text-xs text-slate-500">XP Earned</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-amber-600">{progress.currentStreak || 0}</div>
                      <div className="text-xs text-slate-500">Day Streak</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-violet-600">{progress.badges?.length || 0}</div>
                      <div className="text-xs text-slate-500">Badges</div>
                    </div>
                  </div>
                </div>

                {/* Progress Management */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FileJson className="w-5 h-5 text-primary" />
                      Progress Management
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {/* Export */}
                    <div className="p-6 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-slate-900">Export Progress</h3>
                        <p className="text-sm text-slate-500">Download your progress as a JSON file for backup</p>
                      </div>
                      <Button
                        onClick={handleExportProgress}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                        data-testid="export-progress-btn"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                    {/* Import */}
                    <div className="p-6 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-slate-900">Import Progress</h3>
                        <p className="text-sm text-slate-500">Restore progress from a previously exported file</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImportProgress}
                          accept=".json"
                          className="hidden"
                          data-testid="import-progress-input"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          data-testid="import-progress-btn"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </Button>
                        {importStatus === 'success' && (
                          <Check className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Progress */}
                <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold text-rose-900 mb-1">Reset All Progress</h3>
                      <p className="text-rose-700 text-sm mb-4">
                        This will permanently delete all your completed modules, XP, streaks, and badges.
                        Consider exporting your progress first!
                      </p>
                      <AnimatePresence>
                        {!showResetConfirm ? (
                          <Button
                            onClick={() => setShowResetConfirm(true)}
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-100"
                            data-testid="reset-progress-btn"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Progress
                          </Button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 flex-wrap"
                          >
                            <span className="text-rose-800 font-medium">Are you absolutely sure?</span>
                            <Button
                              onClick={handleResetConfirm}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                              data-testid="reset-confirm-btn"
                            >
                              Yes, Delete Everything
                            </Button>
                            <Button
                              onClick={() => setShowResetConfirm(false)}
                              variant="ghost"
                              className="text-slate-600"
                            >
                              Cancel
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Safety & Privacy Link */}
                <div className="text-center">
                  <Link
                    to="/parents"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    View Safety & Privacy Information
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default Account;
