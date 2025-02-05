import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TextEditor } from "@/components/TextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ScriptEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [script, setScript] = useState<{
    title: string;
    content: string;
    admin_id: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScript = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get script data
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .select("*")
          .eq("id", id)
          .single();

        if (scriptError) throw scriptError;
        if (!scriptData) {
          toast({
            title: "Error",
            description: "Script not found",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }

        setScript(scriptData);
        setIsAdmin(user.id === scriptData.admin_id);
        setLoading(false);
      } catch (error) {
        console.error("Error loading script:", error);
        toast({
          title: "Error",
          description: "Failed to load script",
          variant: "destructive",
        });
        navigate("/profile");
      }
    };

    loadScript();
  }, [id, navigate]);

  const handleSuggestChange = async (newContent: string) => {
    if (!script || !id) return;

    try {
      const { error } = await supabase
        .from("scripts")
        .update({ content: newContent })
        .eq("id", id);

      if (error) throw error;

      setScript({ ...script, content: newContent });
    } catch (error) {
      console.error("Error updating script:", error);
      toast({
        title: "Error",
        description: "Failed to update script",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!script || !id) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>{script.title}</CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your script" : "Suggest changes to this script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextEditor
            isAdmin={isAdmin}
            originalContent={script.content}
            scriptId={id}
            onSuggestChange={handleSuggestChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;