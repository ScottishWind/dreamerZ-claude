import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Download, Upload, RotateCcw, Check, 
  AlertTriangle, FileJson, Shield, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useProgress } from '../hooks/useProgress';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { progress, resetProgress, isLoaded } = useProgress();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // 'success', 'error'
  const fileInputRef = useRef(null);

  // Export progress to JSON
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

  // Import progress from JSON
  const handleImportProgress = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result);
        
        // Validate the imported data structure
        if (!importedData.version || !importedData.completedModules) {
          throw new Error('Invalid progress file format');
        }
        
        // Save to localStorage
        localStorage.setItem('dreamerz_beta_progress_v1', JSON.stringify(importedData));
        
        setImportStatus('success');
        toast.success('Progress imported! Refreshing...');
        
        // Reload to apply changes
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

  // Reset progress with confirmation
  const handleResetConfirm = () => {
    resetProgress();
    setShowResetConfirm(false);
    toast.success('Progress reset successfully!');
  };

  // Calculate stats
  const totalModules = Object.values(progress.completedModules || {}).reduce(
    (acc, tool) => acc + Object.keys(tool).length, 0
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Settings" 
        description="Manage your DreamerZ_Lite progress, export data, and configure your learning experience."
      />
      
      <div className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-primary" />
              Settings
            </h1>
            <p className="text-slate-600">Manage your progress and preferences</p>
          </motion.div>

          {/* Current Progress Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
          >
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
          </motion.div>

          {/* Progress Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6"
          >
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
          </motion.div>

          {/* Reset Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-rose-50 rounded-2xl border border-rose-200 p-6"
          >
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
          </motion.div>

          {/* Safety & Privacy Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center"
          >
            <Link 
              to="/parents" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
            >
              <Shield className="w-4 h-4" />
              View Safety & Privacy Information
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
