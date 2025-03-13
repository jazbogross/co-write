
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import GitHubAuthButton from '@/components/auth/GitHubAuthButton';
import EmailAuthForm from '@/components/auth/EmailAuthForm';
import OAuthRedirectHandler from '@/components/auth/OAuthRedirectHandler';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already logged in, redirect to profile
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OAuthRedirectHandler />
          
          <div>
            <GitHubAuthButton loading={loading} setLoading={setLoading} />
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

          <EmailAuthForm loading={loading} setLoading={setLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
