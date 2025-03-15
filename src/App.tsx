
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import ScriptEdit from "@/pages/ScriptEdit";
import NotFound from "@/pages/NotFound";
import GitHubCallback from "@/pages/GitHubCallback";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/useAuth";
import { useState, useEffect } from "react";
import { cleanupDuplicateTokens } from './utils/sessionDebug';

export default function App() {
  const [appInitTime] = useState(new Date().toISOString());
  
  useEffect(() => {
    // Clean up any duplicate auth tokens on app initialization
    cleanupDuplicateTokens();
    
    console.log("🔑 App: Initializing application", { 
      time: appInitTime,
      url: window.location.href,
      path: window.location.pathname
    });
    
    // Log Supabase and browser info for debugging
    console.log("🔑 App: Runtime information", {
      localStorage: localStorage.length,
      hasSupabasePersistSession: localStorage.getItem('sb-uoasmfawwtkejjdglyws-auth-token') !== null,
      userAgent: navigator.userAgent,
      language: navigator.language,
      referrer: document.referrer || 'none'
    });
    
    return () => {
      console.log("🔑 App: App unmounting", { time: new Date().toISOString() });
    };
  }, [appInitTime]);
  
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/scripts/:id" element={<ScriptEdit />} />
          <Route path="/github/callback" element={<GitHubCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
