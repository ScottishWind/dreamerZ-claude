import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "./components/ui/sonner";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ErrorBoundary, NotFound } from "./components/ErrorStates";
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

/** Redirect /tools/:toolId → /learn/:toolId preserving the param */
const ToolRedirect = () => {
  const { toolId } = useParams();
  return <Navigate to={`/learn/${toolId}`} replace />;
};

function App() {
  return (
    <HelmetProvider>
      <div className="App flex flex-col min-h-screen">
        <BrowserRouter>
          <AuthProvider>
          <LanguageProvider>
          <LearningProgressProvider>
            <ErrorBoundary>
              <Navbar />
              <main className="flex-grow pt-16">
                <Routes>
                  {/* Primary routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/learn" element={<LearnHub />} />
                  <Route path="/learn/:toolId" element={<ToolJourney />} />
                  <Route path="/myprogress" element={<LearnHub viewMode="progress" />} />
                  <Route path="/parents" element={<Parents />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ChangePassword />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/admin" element={<AdminPanel />} />

                  {/* Parent dashboard routes */}
                  <Route path="/parent" element={<ParentDashboard />} />
                  <Route path="/parent/students/:studentUserId" element={<ParentStudentDetail />} />

                  {/* Backward-compatible redirects */}
                  <Route path="/tools" element={<Navigate to="/learn" replace />} />
                  <Route path="/tools/:toolId" element={<ToolRedirect />} />
                  <Route path="/curriculum" element={<Navigate to="/learn" replace />} />
                  <Route path="/prompt-lab" element={<Navigate to="/learn" replace />} />
                  <Route path="/profile" element={<Navigate to="/account" replace />} />
                  <Route path="/settings" element={<Navigate to="/account" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </ErrorBoundary>
            <Toaster position="bottom-right" />
          </LearningProgressProvider>
          </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
