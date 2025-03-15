
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HomeIcon } from "lucide-react";

interface ProfileHeaderProps {
  onSignOut: () => Promise<void>;
}

export function ProfileHeader({ onSignOut }: ProfileHeaderProps) {
  return (
    <div className="flex justify-center gap-4 mt-8">
      <Button variant="outline" asChild>
        <Link to="/">
          <HomeIcon className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
      <Button variant="outline" onClick={onSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
