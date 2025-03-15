
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { GitHubAuthButton } from './GitHubAuthButton';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const AuthContainer = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const success = await signIn(email, password);
      if (success) {
        navigate('/profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("An unexpected error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Use username as email username part by default
      const username = email.split('@')[0];
      await signUp(email, password, username);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error("An unexpected error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-[400px]">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Welcome</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <GitHubAuthButton disabled={loading} />
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
            <LoginForm onLogin={handleLogin} isLoading={loading} />
          </TabsContent>
          <TabsContent value="signup" className="space-y-4">
            <SignupForm onSignup={handleSignup} isLoading={loading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
