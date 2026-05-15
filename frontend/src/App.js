import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "./components/ui/sonner";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ErrorBoundary, NotFound } from "./components/ErrorStates";
import { RequireAuth, RequireRole } from "./components/RequireRole";
import { Landing } from "./pages/Landing";
import { LearnHub } from "./pages/LearnHub";
import { ToolJourney } from "./pages/ToolJourney";
import { Parents } from "./pages/Parents";
import { Account } from "./pages/Account";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ChangePassword } from "./pages/ChangePassword";
import { ForgotPassword } from "./pages/ForgotPassword";
import { AdminPanel } from "./pages/AdminPanel";
import { ParentDashboard } from "./pages/ParentDashboard";
import { ParentStudentDetail } from "./pages/ParentStudentDetail";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import { LearningProgressProvider } from "./hooks/useLearningProgress";
import { ProgressProvider } from "./hooks/useProgress";
import { useEffect } from "react";

/** Redirect /tools/:toolId → /learn/:toolId preserving the param */
const ToolRedirect = () => {
  const { toolId } = useParams();
  return <Navigate to={`/learn/${toolId}`} replace />;
};

function App() {
  // Keepalive: ping backend health endpoint every 1 minute to prevent Render from shutting down
  useEffect(() => {
    const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
    const pingBackend = async () => {
      try {
        await fetch(`${API_BASE}/api/health`, {
          method: 'GET',
          cache: 'no-store',
        });
      } catch (err) {
        // Silent fail — keepalive is best-effort
      }
    };

    // Ping immediately on mount, then every 1 minute
    pingBackend();
    const interval = setInterval(pingBackend, 1 * 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  return (
    <HelmetProvider>
      <div className="App flex flex-col min-h-screen">
        <BrowserRouter>
          <AuthProvider>
          <LanguageProvider>
          <LearningProgressProvider>
          <ProgressProvider>
            <ErrorBoundary>
              <Navbar />
              <main className="flex-grow pt-16">
                <Routes>
                  {/* Primary routes */}
                  <Route path="/home" element={<Landing />} />
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/learn" element={<LearnHub />} />
                  <Route path="/learn/:toolId" element={
                    <RequireAuth>
                      <ToolJourney />
                    </RequireAuth>
                  } />
                  <Route path="/myprogress" element={
                    <RequireAuth>
                      <LearnHub viewMode="progress" />
                    </RequireAuth>
                  } />
                  <Route path="/parents" element={<Parents />} />
                  <Route path="/account" element={
                    <RequireAuth>
                      <Account />
                    </RequireAuth>
                  } />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={
                    <RequireAuth>
                      <ChangePassword />
                    </RequireAuth>
                  } />
                  <Route path="/forgot-password" element={
                    <RequireAuth>
                      <ForgotPassword />
                    </RequireAuth>
                  } />
                  <Route
                    path="/admin"
                    element={
                      <RequireRole roles={["creator", "admin"]}>
                        <AdminPanel />
                      </RequireRole>
                    }
                  />

                  {/* Parent dashboard routes */}
                  <Route
                    path="/parentdashboard"
                    element={
                      <RequireRole roles={["supervisor", "admin", "creator"]}>
                        <ParentDashboard />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/parentdashboard/students/:studentUserId"
                    element={
                      <RequireRole roles={["supervisor", "admin"]}>
                        <ParentStudentDetail />
                      </RequireRole>
                    }
                  />

                  {/* Backward-compatible redirects */}
                  <Route path="/tools" element={<Navigate to="/learn" replace />} />
                  <Route path="/tools/:toolId" element={<ToolRedirect />} />
                  <Route path="/curriculum" element={<Navigate to="/learn" replace />} />
                  <Route path="/prompt-lab" element={<Navigate to="/learn" replace />} />
                  <Route path="/profile" element={<Navigate to="/account" replace />} />
                  <Route path="/settings" element={<Navigate to="/account" replace />} />
                  <Route path="/parent" element={<Navigate to="/parentdashboard" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </ErrorBoundary>
            <Toaster position="bottom-right" />
          </ProgressProvider>
          </LearningProgressProvider>
          </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
