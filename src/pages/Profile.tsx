import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ScriptsList } from "@/components/profile/ScriptsList";
import { Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Script = {
  id: string;
  title: string;
  created_at: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ email: string; username: string } | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isGithubConnected, setIsGithubConnected] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has GitHub connected
      const { data: { provider } } = await supabase.auth.getSession();
      setIsGithubConnected(provider === 'github');

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, username")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfileData(profile);
      }
      
      const { data: userScripts } = await supabase
        .from("scripts")
        .select("id, title, created_at")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });

      if (userScripts) {
        setScripts(userScripts);
      }
      
      setLoading(false);
    }

    loadProfile();
  }, [navigate]);

  const handleGithubConnect = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect GitHub account",
        variant: "destructive",
      });
    }
  };

  if (loading || !profileData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-10">
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>GitHub Connection</CardTitle>
          <CardDescription>
            Connect your GitHub account to enable private repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGithubConnected ? (
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">GitHub account connected</span>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleGithubConnect}
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Account
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Scripts</CardTitle>
          <CardDescription>
            Manage your scripts or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScriptsList scripts={scripts} />
        </CardContent>
      </Card>
    </div>
  );
}