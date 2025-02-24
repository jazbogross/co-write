
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function GitHubCallback() {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const installationId = params.get("installation_id");

      if (installationId) {
        try {
          // Verify the installation
          console.log('Verifying GitHub installation...');
          const { data, error } = await supabase.functions.invoke('verify-github-installation', {
            body: { installationId }
          });

          if (error || !data?.active) {
            throw new Error(error?.message || 'Installation verification failed');
          }

          // If verification is successful, store the installation ID
          localStorage.setItem("github_app_installation_id", installationId);
          toast({
            title: "Success",
            description: "GitHub App installed successfully",
          });
        } catch (error) {
          console.error('Installation verification error:', error);
          toast({
            title: "Error",
            description: "Failed to verify GitHub App installation",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Installation ID not found in callback",
          variant: "destructive",
        });
      }

      // Optionally delay the redirect so the user can see the toast message
      setTimeout(() => {
        navigate("/");
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
