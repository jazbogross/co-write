import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';
interface Script {
  id: string;
  title: string;
  created_at: string;
  admin_id: string;
  github_repo: string | null;
  github_owner: string | null;
  profiles?: {
    username: string;
  } | null;
}
export default function Index() {
  const [publicScripts, setPublicScripts] = useState<Script[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      // Load public scripts
      const {
        data: scripts
      } = await supabase.from('scripts').select(`
          id,
          title,
          created_at,
          admin_id,
          github_repo,
          github_owner,
          profiles (
            username
          )
        `).eq('is_private', false).order('created_at', {
        ascending: false
      });
      if (scripts) {
        setPublicScripts(scripts);
      }

      // Load user's suggestions if logged in
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session?.user) {
        const {
          data: suggestions
        } = await supabase.from('script_suggestions').select(`
            id,
            content,
            status,
            created_at,
            scripts (
              title
            )
          `).eq('user_id', session.user.id).order('created_at', {
          ascending: false
        });
        if (suggestions) {
          setUserSuggestions(suggestions);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  return <div className="container px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Collaborative Script Writing</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/profile')}>
            Profile
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Public Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {publicScripts.map(script => <Card key={script.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{script.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created by {script.profiles?.username || 'Unknown user'} on{' '}
                          {new Date(script.created_at).toLocaleDateString()}
                        </p>
                        {script.github_owner && script.github_repo && <a href={`https://github.com/${script.github_owner}/${script.github_repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 mt-1">
                            <Github className="h-4 w-4" />
                            View on GitHub
                          </a>}
                      </div>
                      <Button variant="outline" onClick={() => navigate(`/scripts/${script.id}`)}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>)}
              {publicScripts.length === 0 && <p className="text-center text-muted-foreground py-4">
                  No public scripts available
                </p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userSuggestions.map(suggestion => <Card key={suggestion.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          {suggestion.scripts?.title || 'Untitled Script'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="capitalize">{suggestion.status}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Suggested on{' '}
                          {new Date(suggestion.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate(`/scripts/${suggestion.scripts?.id}`)}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>)}
              {userSuggestions.length === 0 && <p className="text-center text-muted-foreground py-4">
                  You haven't made any suggestions yet
                </p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}