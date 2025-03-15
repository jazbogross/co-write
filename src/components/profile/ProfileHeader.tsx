
import { Button } from "@/components/ui/button";

interface ProfileHeaderProps {
  onSignOut: () => Promise<void>;
}

export function ProfileHeader({ onSignOut }: ProfileHeaderProps) {
  return (
    <div className="flex justify-center mt-8">
      <Button variant="outline" onClick={onSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
