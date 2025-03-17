
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { useOAuthRedirect } from '@/hooks/useOAuthRedirect';
import { useSession } from '@supabase/auth-helpers-react';

const Auth = () => {
  const navigate = useNavigate();
  const session = useSession();
  
  // Handle OAuth redirect with code
  useOAuthRedirect();

  // If user is already logged in, redirect to profile
  useEffect(() => {
    if (session) {
      navigate('/profile');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <AuthContainer />
    </div>
  );
};

export default Auth;
