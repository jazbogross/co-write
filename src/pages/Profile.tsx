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
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ScriptsList } from "@/components/profile/ScriptsList";

type Script = {
  id: string;
  title: string;
  created_at: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ email: string; username: string } | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

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