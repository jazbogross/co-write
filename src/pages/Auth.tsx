
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Github } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { signIn, signUp, user } = useAuth();

  // Handle OAuth redirect with code
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
            
            // Store the github_access_token in the profiles table
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                github_access_token: providerToken,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
              
            if (updateError) {
              console.error("Auth: Error storing GitHub token:", updateError);
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

  // If user is already logged in, redirect to profile
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleAuth = async (action: 'login' | 'signup') => {
    try {
      setLoading(true);
      let success = false;
      
      if (action === 'signup') {
        // Use username as email username part by default
        const username = email.split('@')[0];
        success = await signUp(email, password, username);
      } else {
        success = await signIn(email, password);
      }

      if (success && action === 'login') {
        navigate('/profile');
      }
    } catch (error) {
      console.error('Auth error:', error);
      uiToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    try {
      setLoading(true);
      console.log("Auth: Initiating GitHub OAuth");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error("Auth: GitHub OAuth error:", error);
        uiToast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("Auth: GitHub OAuth initiated successfully");
      }
    } catch (error) {
      console.error('GitHub auth error:', error);
      uiToast({
        title: "Error",
        description: "Failed to authenticate with GitHub",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGitHubAuth}
              disabled={loading}
            >
              <Github className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => handleAuth('login')}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Login'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => handleAuth('signup')}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Sign Up'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
