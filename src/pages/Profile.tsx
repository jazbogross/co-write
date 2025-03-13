
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ScriptsCard } from "@/components/profile/ScriptsCard";
import { GitHubConnectionCard } from "@/components/profile/GitHubConnectionCard";
import { useAuth } from "@/hooks/useAuth";
import { AuthenticationCheck } from "@/components/profile/AuthenticationCheck";
import { ProfileLoadingState } from "@/components/profile/ProfileLoadingState";
import { useProfileData } from "@/hooks/useProfileData";

export default function Profile() {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  console.log(`📋 PROFILE: Component rendering (render #${renderCountRef.current})`);
  
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, scripts, loading, fetchError } = useProfileData();

  console.log("📋 PROFILE: Current states -", {
    renderCount: renderCountRef.current,
    loading
  });

  const handleSignOut = async () => {
    try {
      console.log("📋 PROFILE: Signing out");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("📋 PROFILE: Error signing out:", error);
    }
  };

  return (
    <AuthenticationCheck>
      {loading ? (
        <ProfileLoadingState 
          message="Loading profile..." 
          fetchError={fetchError} 
        />
      ) : (
        <div className="container max-w-6xl py-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <UserProfileCard profileData={profile} />
              <GitHubConnectionCard />
            </div>
            <div>
              <ScriptsCard scripts={scripts} />
            </div>
          </div>
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </AuthenticationCheck>
  );
}
