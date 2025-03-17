
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { ProfileError } from "@/components/profile/ProfileError";
import { ProfileDataLoader } from "@/components/profile/ProfileDataLoader";
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function Profile() {
  console.log("📋 PROFILE: Component rendering");
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const supabase = useSupabaseClient();

  console.log("📋 PROFILE: Current states -", {
    userExists: !!session,
    userId: session?.user?.id
  });

  // Redirect to auth page if not authenticated - only on this page
  useEffect(() => {
    if (!session) {
      console.log("📋 PROFILE: No authenticated user, redirecting to auth page");
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [session, navigate, location.pathname]);

  const handleSignOut = async () => {
    try {
      console.log("📋 PROFILE: Signing out");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
    } catch (error) {
      console.error("📋 PROFILE: Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Handle the case where the user is not authenticated
  if (!session) {
    console.log("📋 PROFILE: User not authenticated, showing error or redirecting");
    return <ProfileLoading isAuthLoading={true} />;
  }

  const user = session.user;
  
  console.log("📋 PROFILE: Auth check complete, user authenticated, rendering profile content for user:", user.id);
  return (
    <>
      <ProfileDataLoader key={user.id}>
        {({ profile, scripts, loading, fetchError }) => {
          // Handle the case where profile data is loading
          if (loading) {
            console.log("📋 PROFILE: Profile data is loading");
            return <ProfileLoading fetchError={fetchError} />;
          }

          console.log("📋 PROFILE: Rendering complete profile page with", scripts.length, "scripts");
          return (
            <>
              <ProfileContent profile={profile} scripts={scripts} />
              <ProfileHeader onSignOut={handleSignOut} />
            </>
          );
        }}
      </ProfileDataLoader>
    </>
  );
}
