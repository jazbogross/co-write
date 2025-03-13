
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GitHubCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('GitHubCallback: useEffect: handleCallback: start');
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      console.log('GitHubCallback: useEffect: handleCallback: params:', { code: code ? "Found" : "Not found", state });

      if (code) {
        console.log('GitHubCallback: useEffect: handleCallback: Found GitHub code, processing...');
        try {
          // The access token will be processed in Auth.tsx in the redirect handler
          toast.success("GitHub authorization successful");
          
          // Redirect to the original page or profile
          const redirectPath = state ? decodeURIComponent(state) : "/profile";
          console.log('GitHubCallback: useEffect: handleCallback: redirecting to', redirectPath);
          navigate(redirectPath);
        } catch (error: any) {
          console.error('GitHubCallback: useEffect: handleCallback: error:', error);
          toast.error("Failed to process GitHub authorization");
          setTimeout(() => navigate('/profile'), 2000);
        }
      } else {
        // Navigate back to the original page or profile
        const redirectPath = state ? decodeURIComponent(state) : "/profile";
        console.log('GitHubCallback: useEffect: handleCallback: no code, redirecting to', redirectPath);
        setTimeout(() => {
          navigate(redirectPath);
        }, 1000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">GitHub Connection</h1>
        <p>Processing GitHub integration...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        <p className="text-sm text-muted-foreground">You will be redirected shortly.</p>
      </div>
    </div>
  );
}
