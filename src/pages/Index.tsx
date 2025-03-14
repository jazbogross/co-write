
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, GitForkIcon, LockIcon, EyeIcon, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Script {
  id: string;
  title: string;
  created_at: string;
  admin_id: string;
  is_private?: boolean;
  admin_username?: string;
}

export const Index = () => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  console.log(`🏠 INDEX: Component rendering (render #${renderCountRef.current})`);
  
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  console.log("🏠 INDEX: Current states -", {
    renderCount: renderCountRef.current,
    authLoading,
    isAuthenticated,
    userExists: !!user,
    userId: user?.id,
    isLoading,
    hasFetched,
    location: window.location.pathname,
    timestamp: new Date().toISOString()
  });
  
  // Monitor auth state changes
  useEffect(() => {
    console.log("🏠 INDEX: Auth state changed:", { 
      authLoading, 
      isAuthenticated, 
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [authLoading, isAuthenticated, user]);
  
  useEffect(() => {
    // Only fetch scripts if authentication state is resolved and we haven't already fetched
    if (!authLoading && !hasFetched) {
      console.log("🏠 INDEX: Auth loading complete, fetching scripts");
      fetchScripts();
    }
  }, [authLoading, hasFetched]);
  
  const fetchScripts = async () => {
    console.log("🏠 INDEX: Fetching scripts...");
    setIsLoading(true);
    
    try {
      if (isAuthenticated && user) {
        console.log("🏠 INDEX: User is logged in, fetching all scripts for user:", user.id);
        // If user is logged in, fetch all public scripts and user's private scripts
        const { data, error } = await supabase
          .from('scripts')
          .select(`
            id,
            title,
            created_at,
            admin_id,
            is_private,
            github_repo,
            github_owner
          `);
          
        if (error) {
          console.error("🏠 INDEX: Error fetching scripts:", error);
          setFetchError(`Scripts fetch error: ${error.message}`);
          throw error;
        }
        
        console.log("🏠 INDEX: Fetched scripts:", data);
        
        if (!data || data.length === 0) {
          setScripts([]);
          setHasFetched(true);
          setIsLoading(false);
          return;
        }
        
        // Fetch admin usernames in a separate query
        try {
          const adminIds = [...new Set(data.map(script => script.admin_id))];
          console.log("🏠 INDEX: Fetching usernames for admin IDs:", adminIds);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', adminIds);
            
          if (profilesError) {
            console.error("🏠 INDEX: Error fetching profiles:", profilesError);
            setFetchError(`Profiles fetch error: ${profilesError.message}`);
            
            // Continue with default usernames if profiles fetch fails
            const formattedScripts = data.map(script => ({
              id: script.id,
              title: script.title,
              created_at: script.created_at,
              admin_id: script.admin_id,
              is_private: script.is_private ?? false,
              admin_username: 'Unknown'
            }));
            
            setScripts(formattedScripts);
          } else {
            console.log("🏠 INDEX: Fetched profiles:", profilesData);
            
            // Create a map of admin_id to username
            const adminUsernameMap = new Map();
            profilesData?.forEach(profile => {
              adminUsernameMap.set(profile.id, profile.username);
            });
            
            const formattedScripts = data.map(script => ({
              id: script.id,
              title: script.title,
              created_at: script.created_at,
              admin_id: script.admin_id,
              is_private: script.is_private ?? false,
              admin_username: adminUsernameMap.get(script.admin_id) || 'Unknown'
            }));
            
            console.log("🏠 INDEX: Formatted scripts:", formattedScripts);
            setScripts(formattedScripts);
          }
        } catch (profileError) {
          console.error("🏠 INDEX: Error processing profiles:", profileError);
          // Continue with default usernames
          const formattedScripts = data.map(script => ({
            id: script.id,
            title: script.title,
            created_at: script.created_at,
            admin_id: script.admin_id,
            is_private: script.is_private ?? false,
            admin_username: 'Unknown'
          }));
          
          setScripts(formattedScripts);
        }
      } else {
        console.log("🏠 INDEX: No user logged in, fetching only public scripts");
        // If no user is logged in, fetch only public scripts
        try {
          const { data, error } = await supabase
            .from('scripts')
            .select(`
              id,
              title,
              created_at,
              admin_id,
              is_private,
              github_repo,
              github_owner
            `)
            .eq('is_private', false);
            
          if (error) {
            console.error("🏠 INDEX: Error fetching public scripts:", error);
            setFetchError(`Public scripts fetch error: ${error.message}`);
            throw error;
          }
          
          console.log("🏠 INDEX: Fetched public scripts:", data);
          
          if (!data || data.length === 0) {
            setScripts([]);
            setHasFetched(true);
            setIsLoading(false);
            return;
          }
          
          // Fetch admin usernames in a separate query
          try {
            const adminIds = [...new Set(data.map(script => script.admin_id))];
            console.log("🏠 INDEX: Fetching usernames for admin IDs:", adminIds);
            
            if (adminIds.length === 0) {
              setScripts([]);
              setHasFetched(true);
              setIsLoading(false);
              return;
            }
            
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', adminIds);
              
            if (profilesError) {
              console.error("🏠 INDEX: Error fetching profiles for public scripts:", profilesError);
              setFetchError(`Profiles fetch error: ${profilesError.message}`);
              
              // Continue with default usernames if profiles fetch fails
              const formattedScripts = data.map(script => ({
                id: script.id,
                title: script.title,
                created_at: script.created_at,
                admin_id: script.admin_id,
                is_private: false,
                admin_username: 'Unknown'
              }));
              
              setScripts(formattedScripts);
            } else {
              console.log("🏠 INDEX: Fetched profiles for public scripts:", profilesData);
              
              // Create a map of admin_id to username
              const adminUsernameMap = new Map();
              profilesData?.forEach(profile => {
                adminUsernameMap.set(profile.id, profile.username);
              });
              
              const formattedScripts = data.map(script => ({
                id: script.id,
                title: script.title,
                created_at: script.created_at,
                admin_id: script.admin_id,
                is_private: false,
                admin_username: adminUsernameMap.get(script.admin_id) || 'Unknown'
              }));
              
              console.log("🏠 INDEX: Formatted public scripts:", formattedScripts);
              setScripts(formattedScripts);
            }
          } catch (profileError) {
            console.error("🏠 INDEX: Error processing profiles for public scripts:", profileError);
            // Continue with default usernames
            const formattedScripts = data.map(script => ({
              id: script.id,
              title: script.title,
              created_at: script.created_at,
              admin_id: script.admin_id,
              is_private: false,
              admin_username: 'Unknown'
            }));
            
            setScripts(formattedScripts);
          }
        } catch (publicScriptsError) {
          console.error("🏠 INDEX: Error fetching public scripts:", publicScriptsError);
          setScripts([]);
        }
      }
      
      setHasFetched(true);
      console.log("🏠 INDEX: Scripts fetched successfully, hasFetched set to true");
    } catch (error) {
      console.error('🏠 INDEX: Error fetching scripts:', error);
      setScripts([]); // Set empty array to avoid undefined errors
      toast.error("Failed to load scripts. Please try again later.");
    } finally {
      setIsLoading(false);
      console.log("🏠 INDEX: Loading state set to false");
    }
  };
  
  console.log("🏠 INDEX: Rendering component with state:", { 
    scriptsCount: scripts.length, 
    isLoading, 
    userAuthenticated: !!user 
  });
  
  // Add the rest of the component code (JSX return)
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Script Library</h2>
        {isAuthenticated && user && (
          <Button asChild>
            <Link to="/profile">Manage Your Scripts</Link>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="h-16 bg-gray-100 rounded"></CardContent>
              <CardFooter className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-xl font-medium text-gray-600 mb-4">No scripts found</h3>
          {fetchError && (
            <div className="mt-2 p-4 bg-red-50 text-red-800 rounded mb-4">
              Debug info: {fetchError}
            </div>
          )}
          {user ? (
            <Button asChild>
              <Link to="/profile">Create Your First Script</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/auth">Sign In to Create Scripts</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map(script => (
            <Card key={script.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="truncate">{script.title}</span>
                  {script.is_private && (
                    <LockIcon className="ml-2 h-4 w-4 text-amber-500" />
                  )}
                </CardTitle>
                <CardDescription className="flex items-center text-sm">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {format(new Date(script.created_at), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{script.admin_username ? script.admin_username[0] : '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{script.admin_username}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/script/${script.id}`}>
                    <EyeIcon className="mr-1 h-4 w-4" />
                    View
                  </Link>
                </Button>
                {user && (
                  <Button asChild size="sm">
                    <Link to={`/script/${script.id}/edit`}>
                      <GitForkIcon className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
