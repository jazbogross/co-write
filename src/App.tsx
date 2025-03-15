
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
import { cleanupLegacyTokens } from './utils/sessionDebug';

export default function App() {
  const [appInitTime] = useState(new Date().toISOString());
  
  useEffect(() => {
    // Clean up any legacy auth tokens on app initialization
    const tokensRemoved = cleanupLegacyTokens();
    
    console.log("🔑 App: Initializing application", { 
      time: appInitTime,
      url: window.location.href,
      path: window.location.pathname,
      tokensCleanedUp: tokensRemoved
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
