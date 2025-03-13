
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
  const { user, loading: authLoading } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  
  useEffect(() => {
    // Only fetch scripts if authentication state is resolved and we haven't already fetched
    if (!authLoading && !hasFetched) {
      fetchScripts();
    }
  }, [authLoading, hasFetched]);
  
  const fetchScripts = async () => {
    console.log("Index: Fetching scripts...");
    setIsLoading(true);
    
    try {
      if (user) {
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
          
        if (error) throw error;
        
        // Fetch admin usernames in a separate query
        const adminIds = [...new Set(data.map(script => script.admin_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', adminIds);
          
        if (profilesError) throw profilesError;
        
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
        
        setScripts(formattedScripts);
      } else {
        // If no user is logged in, fetch only public scripts
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
          
        if (error) throw error;
        
        // Fetch admin usernames in a separate query
        const adminIds = [...new Set(data.map(script => script.admin_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', adminIds);
          
        if (profilesError) throw profilesError;
        
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
        
        setScripts(formattedScripts);
      }
      
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
