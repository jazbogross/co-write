
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Script } from "@/types/repository";

export default function Index() {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("scripts")
          .select(`
            id, 
            title, 
            created_at, 
            admin_id, 
            github_repo, 
            github_owner,
            profiles:admin_id (username)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          // Transform the data to match the Script interface
          const formattedScripts: Script[] = data.map(item => ({
            id: item.id,
            title: item.title,
            admin_id: item.admin_id,
            github_repo: item.github_repo,
            github_owner: item.github_owner,
            created_at: item.created_at,
            profiles: {
              username: item.profiles?.username || 'Unknown user'
            }
          }));
          
          setScripts(formattedScripts);
        }
      } catch (error) {
        console.error("Error fetching scripts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScripts();
  }, []);

  const handleCreateNew = () => {
    navigate("/script/new");
  };

  const handleOpenScript = (id: string) => {
    navigate(`/script/${id}`);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Scripts</h1>
        {user && (
          <Button onClick={handleCreateNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading scripts...</div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No scripts available</p>
          {user && (
            <Button onClick={handleCreateNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Script
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => (
            <Card key={script.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenScript(script.id)}>
              <CardHeader>
                <CardTitle className="truncate">{script.title}</CardTitle>
                <CardDescription>
                  By {script.profiles.username}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <p className="text-gray-500 text-sm">
                  {script.created_at && new Date(script.created_at).toLocaleDateString()}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
