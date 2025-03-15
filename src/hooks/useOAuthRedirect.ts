
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOAuthRedirect = () => {
  useEffect(() => {
    const handleRedirect = async () => {
      // First check if this is a GitHub OAuth redirect by looking at the URL hash
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      const providerToken = params.get('provider_token');
      
      console.log("Auth: Checking for OAuth redirect parameters");
      console.log("Auth: access_token present:", !!accessToken);
      console.log("Auth: provider_token present:", !!providerToken);
      
      if (accessToken && providerToken) {
        console.log("Auth: Detected GitHub OAuth redirect with tokens");
        try {
          // Get the user to find their ID
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log("Auth: Found authenticated user:", user.id);
            console.log("Auth: Auth provider from metadata:", user.app_metadata?.provider);
            console.log("Auth: Storing GitHub access token");
            
            // Detailed logging for debugging
            console.log("Auth: GitHub token to store:", providerToken.substring(0, 10) + "...");
            
            // Store the github_access_token in the profiles table
            // Use upsert instead of update to handle the case where a profile might not exist yet
            const { data: profileData, error: profileCheckError } = await supabase
              .from('profiles')
              .select()
              .eq('id', user.id)
              .single();
              
            if (profileCheckError && profileCheckError.code !== 'PGRST116') {
              console.error("Auth: Error checking profile:", profileCheckError);
              throw profileCheckError;
            }
            
            let updateError;
            
            if (!profileData) {
              console.log("Auth: No existing profile found, creating one");
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
              console.log("Auth: Existing profile found, updating token");
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
              console.error("Auth: Error storing GitHub token:", updateError);
              console.log("Auth: Error details:", JSON.stringify(updateError));
              toast.error("Failed to store GitHub access token. Please try again or contact support.");
            } else {
              console.log("Auth: GitHub token stored successfully");
              toast.success("GitHub connected successfully!");
            }
          } else {
            console.error("Auth: No authenticated user found after GitHub OAuth");
            toast.error("Authentication error. Please try again.");
          }
        } catch (error) {
          console.error("Auth: Error handling OAuth redirect:", error);
          toast.error("Failed to complete GitHub authentication");
        }
        
        // Clean up URL by removing hash
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    handleRedirect();
  }, []);
};
