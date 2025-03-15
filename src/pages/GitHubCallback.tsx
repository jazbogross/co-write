
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
          // Exchange the code for an access token
          // This happens automatically in Supabase's auth flow
          toast.success("GitHub authorization successful");
          
          // Ensure the profile record has the GitHub access token
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log('GitHubCallback: useEffect: Got user after auth:', user.id);
            
            // Get the session to extract the provider token
            const { data: sessionData } = await supabase.auth.getSession();
            const providerToken = sessionData?.session?.provider_token;
            
            console.log('GitHubCallback: useEffect: Provider token available:', !!providerToken);
            
            if (providerToken) {
              console.log('GitHubCallback: Provider token to store:', providerToken.substring(0, 10) + "...");
              
              // First check if profile exists
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select()
                .eq('id', user.id)
                .maybeSingle();
                
              if (profileError) {
                console.error('GitHubCallback: Error checking profile:', profileError);
                console.log('GitHubCallback: Profile error details:', JSON.stringify(profileError));
                throw profileError;
              }
              
              let updateError;
              
              if (!profile) {
                console.log('GitHubCallback: No profile found, creating one');
                // Create a new profile
                const { error } = await supabase
                  .from('profiles')
                  .insert({ 
                    id: user.id,
                    username: user.email?.split('@')[0] || 'user',
                    github_access_token: providerToken,
                    updated_at: new Date().toISOString()
                  });
                updateError = error;
              } else {
                console.log('GitHubCallback: Existing profile found, updating token');
                // Update existing profile
                const { error } = await supabase
                  .from('profiles')
                  .update({ 
                    github_access_token: providerToken,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', user.id);
                updateError = error;
              }
                
              if (updateError) {
                console.error('GitHubCallback: Failed to store GitHub token:', updateError);
                console.log('GitHubCallback: Update error details:', JSON.stringify(updateError));
              } else {
                console.log('GitHubCallback: GitHub token stored successfully');
              }
            } else {
              console.warn('GitHubCallback: No provider token found in session');
            }
          }
          
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
