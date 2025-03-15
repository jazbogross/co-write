
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { ProfileError } from "@/components/profile/ProfileError";
import { ProfileDataLoader } from "@/components/profile/ProfileDataLoader";

export default function Profile() {
  console.log("📋 PROFILE: Component rendering");
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, authChecked } = useAuth();

  console.log("📋 PROFILE: Current states -", {
    authLoading,
    userExists: !!user,
    userId: user?.id,
    authChecked
  });

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!authLoading && !user && authChecked) {
      console.log("📋 PROFILE: No authenticated user and auth checked, redirecting to auth page");
      navigate("/auth");
    }
  }, [user, authLoading, navigate, authChecked]);

  const handleSignOut = async () => {
    try {
      console.log("📋 PROFILE: Signing out");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("📋 PROFILE: Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Handle the case where authentication check is still in progress
  if (authLoading || !authChecked) {
    console.log("📋 PROFILE: Rendering loading state - auth state is loading or not checked yet");
    return <ProfileLoading isAuthLoading={true} />;
  }

  // Handle the case where the user is not authenticated
  if (!user) {
    console.log("📋 PROFILE: User not authenticated, showing error or redirecting");
    return <ProfileError />;
  }

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
};
