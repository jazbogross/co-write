
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
    admin_id: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalContent, setOriginalContent] = useState("");
  const [originalLines, setOriginalLines] = useState([]);

  useEffect(() => {
    const loadScript = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get script data (without content - we'll get that from script_content)
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .select("title, admin_id")
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

        const isUserAdmin = user.id === scriptData.admin_id;
        console.log(`🔄 ScriptEdit: Loaded script, user ${user.id} is ${isUserAdmin ? 'admin' : 'non-admin'}`);

        // Fetch all script content from script_content table with proper columns
        // Important: Don't limit to just one line, and get all needed columns
        const columns = isUserAdmin 
          ? "content, draft, line_number, line_number_draft" 
          : "content, line_number";
          
        const { data: contentData, error: contentError } = await supabase
          .from("script_content")
          .select(columns)
          .eq("script_id", id)
          .order("line_number", { ascending: true });

        if (contentError) {
          console.error("🔄 ScriptEdit: Error fetching content:", contentError);
          throw contentError;
        }

        if (contentData && contentData.length > 0) {
          console.log("🔄 ScriptEdit: Loaded content lines:", contentData.length);
          
          // Store original lines to pass to TextEditor
          setOriginalLines(contentData);
          
          // Also combine the first few lines of content as a string for backward compatibility
          // Safely access the content property with type checking
          const combinedContent = contentData
            .slice(0, 5)
            .map(item => {
              if (item && typeof item === 'object' && 'content' in item) {
                return item.content || "";
              }
              return "";
            })
            .join("\n");
            
          console.log("🔄 ScriptEdit: Combined content sample:", 
            combinedContent.substring(0, 100) + (combinedContent.length > 100 ? "..." : ""));
          
          setOriginalContent(combinedContent);
        } else {
          console.log("🔄 ScriptEdit: No content found");
          setOriginalContent("");
          setOriginalLines([]);
        }

        setScript(scriptData);
        setIsAdmin(isUserAdmin);
        setLoading(false);
      } catch (error) {
        console.error("🔄 Error loading script:", error);
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

  const handleSuggestChange = async () => {
    if (!script || !id) return;

    // All content updates happen directly on script_content through the TextEditor
    toast({
      title: "Success",
      description: "Changes saved successfully",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!script || !id) {
    return null;
  }

  return (
    <div className="container min-w-screen">
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
            originalContent={originalContent}
            originalLines={originalLines}
            scriptId={id}
            onSuggestChange={handleSuggestChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;
