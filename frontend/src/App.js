import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "./components/ui/sonner";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ErrorBoundary, NotFound } from "./components/ErrorStates";
import { Landing } from "./pages/Landing";
import { Tools } from "./pages/Tools";
import { ToolJourney } from "./pages/ToolJourney";
import { PromptLab } from "./pages/PromptLab";
import { Curriculum } from "./pages/Curriculum";
import { Parents } from "./pages/Parents";
import { SettingsPage } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AuthProvider } from "./hooks/useAuth";

function App() {
  return (
    <HelmetProvider>
      <div className="App flex flex-col min-h-screen">
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Navbar />
              <main className="flex-grow pt-16">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/tools/:toolId" element={<ToolJourney />} />
                  <Route path="/prompt-lab" element={<PromptLab />} />
                  <Route path="/curriculum" element={<Curriculum />} />
                  <Route path="/parents" element={<Parents />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </ErrorBoundary>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
