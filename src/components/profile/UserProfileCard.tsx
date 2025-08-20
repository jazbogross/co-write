import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/ProfileForm";

interface UserProfileCardProps {
  profileData: {
    email: string;
    username: string;
  };
}

export function UserProfileCard({ profileData }: UserProfileCardProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm initialData={profileData} />
      </CardContent>
    </Card>
  );
}