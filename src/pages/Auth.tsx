
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContainer } from '@/components/auth/AuthContainer';
import { useOAuthRedirect } from '@/hooks/useOAuthRedirect';
import { useSession } from '@supabase/auth-helpers-react';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const [redirectPath, setRedirectPath] = useState('/');
  
  // Handle OAuth redirect with code
  useOAuthRedirect();

  // Extract the intended redirect path from location state if available
  useEffect(() => {
    const state = location.state as { from?: string } | null;
    if (state?.from && state.from !== '/auth') {
      console.log("📋 AUTH: Setting redirect path from location state:", state.from);
      setRedirectPath(state.from);
    }
  }, [location]);

  // If user is already logged in, redirect to either the intended path or home
  useEffect(() => {
    if (session) {
      console.log("📋 AUTH: User is authenticated, redirecting to:", redirectPath);
      navigate(redirectPath);
    }
  }, [session, navigate, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <AuthContainer redirectPath={redirectPath} />
    </div>
  );
};

export default Auth;
