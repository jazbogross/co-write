
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);

  useEffect(() => {
    console.log('👤 useUserData: Initializing...');
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        console.log('👤 useUserData: Fetching user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('👤 useUserData: Error fetching user:', userError);
          if (mounted) {
            setError(userError.message);
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
          }
        } else if (user) {
          console.log('👤 useUserData: User fetched:', user.id);
          // Check auth provider
          const provider = user.app_metadata?.provider || null;
          console.log('👤 useUserData: Auth provider:', provider);
          
          if (mounted) {
            setUserId(user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        } else {
          console.log('👤 useUserData: No user found');
          if (mounted) {
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
            setError(null);
          }
        }
      } catch (error) {
        console.error('👤 useUserData: Error fetching user:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          setUserId(null);
          setIsLoading(false);
          setAuthProvider(null);
          setAuthCheckedOnce(true);
        }
      }
    };
    
    fetchUser();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('👤 useUserData: Auth state change event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 useUserData: User signed in:', session.user.id);
        const provider = session.user.app_metadata?.provider || null;
        console.log('👤 useUserData: Auth provider on sign in:', provider);
        
        // Update the github_access_token in profile if available
        if (provider === 'github' && session.provider_token) {
          console.log('👤 useUserData: GitHub provider token available, updating profile');
          
          try {
            // First check if profile exists
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select()
              .eq('id', session.user.id)
              .maybeSingle();
              
            if (profileError) {
              console.error('👤 useUserData: Error checking profile:', profileError);
              throw profileError;
            }
            
            if (!profile) {
              console.log('👤 useUserData: No profile found, creating one');
              // Create a new profile
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({ 
                  id: session.user.id,
                  username: session.user.email?.split('@')[0] || 'user',
                  github_access_token: session.provider_token,
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
                console.error('👤 useUserData: Error creating profile:', insertError);
                console.log('👤 useUserData: Insert error details:', JSON.stringify(insertError));
              } else {
                console.log('👤 useUserData: New profile created with GitHub token');
              }
            } else {
              console.log('👤 useUserData: Existing profile found, updating token');
              // Update existing profile
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  github_access_token: session.provider_token,
                  updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id);
                
              if (updateError) {
                console.error('👤 useUserData: Error updating GitHub token:', updateError);
                console.log('👤 useUserData: Update error details:', JSON.stringify(updateError));
              } else {
                console.log('👤 useUserData: GitHub token updated in profile');
              }
            }
          } catch (error) {
            console.error('👤 useUserData: Exception updating profile:', error);
          }
        }
        
        if (mounted) {
          setUserId(session.user.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👤 useUserData: User signed out');
        if (mounted) {
          setUserId(null);
          setAuthProvider(null);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log(`👤 useUserData: ${event} for user:`, session?.user?.id);
        if (mounted && session?.user) {
          const provider = session.user.app_metadata?.provider || null;
          console.log(`👤 useUserData: INITIAL_SESSION for user:`, session.user.id);
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && session.provider_token) {
            console.log('👤 useUserData: GitHub provider token available on token refresh, updating profile');
            
            try {
              // First check if profile exists
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select()
                .eq('id', session.user.id)
                .maybeSingle();
                
              if (profileError) {
                console.error('👤 useUserData: Error checking profile on refresh:', profileError);
                throw profileError;
              }
              
              if (!profile) {
                console.log('👤 useUserData: No profile found on refresh, creating one');
                // Create a new profile
                const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({ 
                    id: session.user.id,
                    username: session.user.email?.split('@')[0] || 'user',
                    github_access_token: session.provider_token,
                    updated_at: new Date().toISOString()
                  });
                  
                if (insertError) {
                  console.error('👤 useUserData: Error creating profile on refresh:', insertError);
                  console.log('👤 useUserData: Insert error details:', JSON.stringify(insertError));
                } else {
                  console.log('👤 useUserData: New profile created with GitHub token on refresh');
                }
              } else {
                console.log('👤 useUserData: Existing profile found on refresh, updating token');
                // Update existing profile
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    github_access_token: session.provider_token,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', session.user.id);
                  
                if (updateError) {
                  console.error('👤 useUserData: Error updating GitHub token on refresh:', updateError);
                  console.log('👤 useUserData: Update error details:', JSON.stringify(updateError));
                } else {
                  console.log('👤 useUserData: GitHub token updated in profile on refresh');
                }
              }
            } catch (error) {
              console.error('👤 useUserData: Exception updating profile on refresh:', error);
            }
          }
          
          if (mounted) {
            setUserId(session.user.id);
            setAuthProvider(provider); 
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        }
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log('👤 useUserData: Cleanup - unsubscribed from auth listener');
    };
  }, []);

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
