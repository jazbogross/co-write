
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ScriptsCard } from "@/components/profile/ScriptsCard";
import { GitHubConnectionCard } from "@/components/profile/GitHubConnectionCard";
import { Script } from "@/types/repository";

interface ProfileContentProps {
  profile: {
    email: string;
    username: string;
  };
  scripts: Script[];
}

export function ProfileContent({ profile, scripts }: ProfileContentProps) {
  console.log("📋 PROFILE-CONTENT: Rendering profile content");
  
  return (
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
    </div>
  );
}
