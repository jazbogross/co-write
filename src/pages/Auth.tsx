
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { useOAuthRedirect } from '@/hooks/useOAuthRedirect';

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Handle OAuth redirect with code
  useOAuthRedirect();

  // If user is already logged in, redirect to profile
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <AuthContainer />
    </div>
  );
};

export default Auth;
