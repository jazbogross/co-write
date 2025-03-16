
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, GitForkIcon, LockIcon, EyeIcon, RefreshCw } from 'lucide-react';
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
  const {
    user,
    loading: authLoading
  } = useAuth();
  const [publicScripts, setPublicScripts] = useState<Script[]>([]);
  const [yourScripts, setYourScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debug logging
  console.log("🏠 INDEX: Component rendering", { 
    authLoading, 
    userExists: !!user, 
    userId: user?.id 
  });

  useEffect(() => {
    if (!authLoading) {
      console.log("🏠 INDEX: Auth loading complete, fetching scripts");
      fetchScripts();
    }
  }, [authLoading]);

  const fetchScripts = async () => {
    console.log("🏠 INDEX: Fetching scripts...");
    setIsLoading(true);
    setFetchError(null);
    
    try {
      // 1. Fetch public scripts with profiles.username
      console.log("🏠 INDEX: Querying for public scripts (is_private=false)");
      const { data: publicData, error: publicError } = await supabase
        .from('scripts')
        .select(`
          id,
          title,
          created_at,
          admin_id,
          is_private,
          profiles!scripts_admin_id_fkey(username)
        `)
        .eq('is_private', false);

      if (publicError) {
        console.error("🏠 INDEX: Error fetching public scripts:", publicError);
        setFetchError(`Public scripts fetch error: ${publicError.message}`);
        toast.error("Failed to load public scripts");
        return;
      }

      console.log("🏠 INDEX: Public scripts raw data:", publicData);
      
      if (!publicData || publicData.length === 0) {
        console.log("🏠 INDEX: No public scripts found in the database");
        setPublicScripts([]);
      } else {
        // Format scripts with admin usernames from profiles
        const formattedPublicScripts = publicData.map(script => ({
          id: script.id,
          title: script.title,
          created_at: script.created_at,
          admin_id: script.admin_id,
          is_private: script.is_private ?? false,
          admin_username: script.profiles?.length > 0 ? script.profiles[0].username : 'Unknown'
        }));

        console.log("🏠 INDEX: Formatted public scripts:", formattedPublicScripts);
        setPublicScripts(formattedPublicScripts);
      }

      // 2. Fetch user's scripts if user is logged in
      if (user) {
        console.log("🏠 INDEX: Fetching scripts for user:", user.id);
        const { data: userScriptsData, error: userScriptsError } = await supabase
          .from('scripts')
          .select(`
            id,
            title,
            created_at,
            admin_id,
            is_private
          `)
          .eq('admin_id', user.id);

        if (userScriptsError) {
          console.error("🏠 INDEX: Error fetching user scripts:", userScriptsError);
          setFetchError(`User scripts fetch error: ${userScriptsError.message}`);
          toast.error("Failed to load your scripts");
        } else {
          console.log("🏠 INDEX: User scripts data:", userScriptsData);
          
          const userFormattedScripts = userScriptsData.map(script => ({
            id: script.id,
            title: script.title,
            created_at: script.created_at,
            admin_id: script.admin_id,
            is_private: script.is_private ?? false,
            admin_username: user.username || 'You'
          }));
          
          setYourScripts(userFormattedScripts);
          console.log("🏠 INDEX: Formatted user scripts:", userFormattedScripts);
        }
      }
    } catch (error) {
      console.error('🏠 INDEX: Error fetching scripts:', error);
      setFetchError(`Failed to fetch scripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Failed to load scripts");
    } finally {
      setIsLoading(false);
      console.log("🏠 INDEX: Loading state set to false");
    }
  };

  const renderScriptCards = (scripts: Script[], showPrivateIndicator = true) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scripts.map(script => (
        <Card key={script.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="truncate">{script.title}</span>
              {showPrivateIndicator && script.is_private && <LockIcon className="ml-2 h-4 w-4 text-amber-500" />}
            </CardTitle>
            <CardDescription className="flex items-center text-sm">
              <CalendarIcon className="mr-1 h-3 w-3" />
              {format(new Date(script.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{script.admin_username ? script.admin_username[0].toUpperCase() : '?'}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600">{script.admin_username}</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button asChild variant="secondary" size="sm">
              <Link to={`/scripts/${script.id}`}>
                <EyeIcon className="mr-1 h-4 w-4" />
                View
              </Link>
            </Button>
            {user && (
              <Button asChild size="sm">
                <Link to={`/scripts/${script.id}`}>
                  <GitForkIcon className="mr-1 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  const renderLoadingCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
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
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Script Library</h2>
        {user && (
          <Button asChild>
            <Link to="/profile">Manage Your Scripts</Link>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        renderLoadingCards()
      ) : (
        <div className="space-y-12">
          {user && yourScripts.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Your Scripts</h3>
              {renderScriptCards(yourScripts)}
            </section>
          )}
          
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold">Public Scripts</h3>
              <Button 
                onClick={() => fetchScripts()}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            
            {publicScripts.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-xl font-medium text-gray-600 mb-4">No public scripts available</h4>
                {fetchError && (
                  <div className="mt-2 p-4 bg-red-50 text-red-800 rounded mb-4 max-w-md mx-auto">
                    {fetchError}
                  </div>
                )}
                <div className="max-w-md mx-auto">
                  <p className="text-gray-500 mb-4">
                    This could be because:
                  </p>
                  <ul className="list-disc text-left pl-8 mb-4 text-gray-500">
                    <li>No one has created public scripts yet</li>
                    <li>Scripts exist but are marked as private</li>
                    <li>There was an error loading the scripts</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => fetchScripts()}
                  variant="default"
                  className="mt-2"
                >
                  Retry Loading Scripts
                </Button>
              </div>
            ) : (
              renderScriptCards(publicScripts, false)
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Index;
