
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProfileLoadingState } from './ProfileLoadingState';

interface AuthenticationCheckProps {
  children: React.ReactNode;
}

export const AuthenticationCheck: React.FC<AuthenticationCheckProps> = ({ children }) => {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !redirecting) {
      console.log("📋 PROFILE: User is not authenticated, redirecting to auth page");
      setRedirecting(true);
      navigate("/auth");
    }
  }, [isAuthenticated, navigate, authLoading, redirecting]);

  // Handle the case where authentication check is still in progress
  if (authLoading) {
    return <ProfileLoadingState message="Checking authentication..." />;
  }

  // Handle the case where the user is not authenticated
  if (!isAuthenticated) {
    return <ProfileLoadingState message="Not authenticated. Redirecting..." />;
  }

  return <>{children}</>;
};
