
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

export default function GitHubCallback() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('GitHubCallback: useEffect: handleCallback: start');
      const params = new URLSearchParams(window.location.search);
      const installationId = params.get("installation_id");
      const state = params.get("state");

      console.log('GitHubCallback: useEffect: handleCallback: params:', { installationId, state });

      if (installationId) {
        console.log('GitHubCallback: useEffect: handleCallback: verifying GitHub installation...', installationId);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error("No authenticated user found");
          }

          // Verify the installation
          const { data, error } = await supabase.functions.invoke('verify-github-installation', {
            body: { installationId }
          });

          console.log('GitHubCallback: useEffect: handleCallback: supabase function response:', { data, error });

          if (error || !data?.active) {
            console.error('GitHubCallback: useEffect: handleCallback: installation verification error:', error);
            throw new Error(error?.message || 'Installation verification failed');
          }

          // If verification is successful, store the installation ID in the database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              github_app_installation_id: installationId,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            throw new Error('Failed to update profile with installation ID');
          }

          console.log('GitHubCallback: useEffect: handleCallback: storing installation ID in database');
          toast.success("GitHub App installed successfully");
          
          // Small delay to ensure database update is processed
          setTimeout(() => {
            const redirectPath = state ? decodeURIComponent(state) : "/profile";
            console.log('GitHubCallback: useEffect: handleCallback: redirecting to', redirectPath);
            navigate(redirectPath);
          }, 1500);
        } catch (error: any) {
          console.error('GitHubCallback: useEffect: handleCallback: installation verification error:', error);
          toast.error("Failed to verify GitHub App installation");
          setTimeout(() => navigate('/profile'), 2000);
        }
      } else {
        // Navigate back to the original page or profile
        const redirectPath = state ? decodeURIComponent(state) : "/profile";
        console.log('GitHubCallback: useEffect: handleCallback: no installation ID, redirecting to', redirectPath);
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
