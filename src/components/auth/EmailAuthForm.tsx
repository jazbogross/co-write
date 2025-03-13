
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface EmailAuthFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const EmailAuthForm = ({ loading, setLoading }: EmailAuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast: uiToast } = useToast();
  const { signIn, signUp } = useAuth();

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

      if (!success) {
        uiToast({
          title: "Error",
          description: "Authentication failed. Please check your credentials.",
          variant: "destructive",
        });
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

  return (
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
  );
};

export default EmailAuthForm;
