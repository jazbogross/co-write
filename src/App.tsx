
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import ScriptEdit from "@/pages/ScriptEdit";
import NotFound from "@/pages/NotFound";
import GitHubCallback from "@/pages/GitHubCallback";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/useAuth";

export default function App() {
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
