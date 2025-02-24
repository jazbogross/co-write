
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function GitHubCallback() {
  const { toast } = useToast();
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
            .update({ github_app_installation_id: installationId })
            .eq('id', user.id);

          if (updateError) {
            throw new Error('Failed to update profile with installation ID');
          }

          console.log('GitHubCallback: useEffect: handleCallback: storing installation ID in database');
          toast({
            title: "Success",
            description: "GitHub App installed successfully",
          });
        } catch (error: any) {
          console.error('GitHubCallback: useEffect: handleCallback: installation verification error:', error);
          toast({
            title: "Error",
            description: "Failed to verify GitHub App installation",
            variant: "destructive",
          });
        }
      }

      // Navigate back to the original page or profile
      const redirectPath = state ? decodeURIComponent(state) : "/profile";
      console.log('GitHubCallback: useEffect: handleCallback: redirecting to', redirectPath);
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Verifying GitHub installation...</p>
    </div>
  );
}
