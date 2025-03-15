import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, GitForkIcon, LockIcon, EyeIcon, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Script {
  id: string;
  title: string;
  created_at: string;
  admin_id: string;
  is_private?: boolean;
  admin_username?: string;
}

export const Index = () => {
  console.log("🏠 INDEX: Component rendering");
  const {
    user,
    loading: authLoading
  } = useAuth();
  const [publicScripts, setPublicScripts] = useState<Script[]>([]);
  const [yourScripts, setYourScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  console.log("🏠 INDEX: Current states -", {
    authLoading,
    userExists: !!user,
    userId: user?.id,
    isLoading,
    hasFetched
  });

  useEffect(() => {
    if (!authLoading && !hasFetched) {
      console.log("🏠 INDEX: Auth loading complete, fetching scripts");
      fetchScripts();
    }
  }, [authLoading, hasFetched]);

  const fetchScripts = async () => {
    console.log("🏠 INDEX: Fetching scripts...");
    setIsLoading(true);
    try {
      const {
        data: publicData,
        error: publicError
      } = await supabase.from('scripts').select(`
          id,
          title,
          created_at,
          admin_id,
          is_private,
          github_repo,
          github_owner
        `).eq('is_private', false);

      if (publicError) {
        console.error("🏠 INDEX: Error fetching public scripts:", publicError);
        setFetchError(`Public scripts fetch error: ${publicError.message}`);
        throw publicError;
      }

      console.log("🏠 INDEX: Fetched public scripts:", publicData);

      const publicAdminIds = [...new Set(publicData.map(script => script.admin_id))];
      let publicFormattedScripts: Script[] = [];
      if (publicAdminIds.length > 0) {
        const {
          data: publicProfilesData,
          error: publicProfilesError
        } = await supabase.from('profiles').select('id, username').in('id', publicAdminIds);

        if (publicProfilesError) {
          console.error("🏠 INDEX: Error fetching profiles for public scripts:", publicProfilesError);
          setFetchError(`Profiles fetch error: ${publicProfilesError.message}`);
          throw publicProfilesError;
        }

        const publicAdminUsernameMap = new Map();
        publicProfilesData?.forEach(profile => {
          publicAdminUsernameMap.set(profile.id, profile.username);
        });

        publicFormattedScripts = publicData.map(script => ({
          id: script.id,
          title: script.title,
          created_at: script.created_at,
          admin_id: script.admin_id,
          is_private: false,
          admin_username: publicAdminUsernameMap.get(script.admin_id) || 'Unknown'
        }));
      }

      setPublicScripts(publicFormattedScripts);

      if (user) {
        const {
          data: userScriptsData,
          error: userScriptsError
        } = await supabase.from('scripts').select(`
            id,
            title,
            created_at,
            admin_id,
            is_private
          `).eq('admin_id', user.id);

        if (userScriptsError) {
          console.error("🏠 INDEX: Error fetching user scripts:", userScriptsError);
          setFetchError(`User scripts fetch error: ${userScriptsError.message}`);
        } else {
          const userFormattedScripts = userScriptsData.map(script => ({
            id: script.id,
            title: script.title,
            created_at: script.created_at,
            admin_id: script.admin_id,
            is_private: script.is_private ?? false,
            admin_username: user.username || 'You'
          }));
          setYourScripts(userFormattedScripts);
        }
      }

      setHasFetched(true);
      console.log("🏠 INDEX: Scripts fetched successfully, hasFetched set to true");
    } catch (error) {
      console.error('🏠 INDEX: Error fetching scripts:', error);
    } finally {
      setIsLoading(false);
      console.log("🏠 INDEX: Loading state set to false");
    }
  };

  const renderScriptCards = (scripts: Script[], showPrivateIndicator = true) => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scripts.map(script => <Card key={script.id} className="hover:shadow-md transition-shadow">
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
            {user && <Button asChild size="sm">
                <Link to={`/script/${script.id}/edit`}>
                  <GitForkIcon className="mr-1 h-4 w-4" />
                  Edit
                </Link>
              </Button>}
          </CardFooter>
        </Card>)}
    </div>;

  const renderLoadingCards = () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent className="h-16 bg-gray-100 rounded"></CardContent>
          <CardFooter className="flex justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </CardFooter>
        </Card>)}
    </div>;

  return <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Script Library</h2>
        {user && <Button asChild>
            <Link to="/profile">Manage Your Scripts</Link>
          </Button>}
      </div>
      
      {isLoading ? renderLoadingCards() : <div className="space-y-12">
          {user && yourScripts.length > 0 && <section>
              <h3 className="text-2xl font-semibold mb-4">Your Scripts</h3>
              {renderScriptCards(yourScripts)}
            </section>}
          
          <section>
            <h3 className="text-2xl font-semibold mb-4">Public Scripts</h3>
            {publicScripts.length === 0 ? <div className="text-center py-10">
                <h4 className="text-xl font-medium text-gray-600 mb-4">No public scripts available</h4>
                {fetchError && <div className="mt-2 p-4 bg-red-50 text-red-800 rounded mb-4">
                    Debug info: {fetchError}
                  </div>}
              </div> : renderScriptCards(publicScripts, false)}
          </section>
        </div>}
    </div>;
};

export default Index;
