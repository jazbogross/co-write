
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Script } from "@/types/repository";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadScripts();
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser(data.user);
    }
  };

  const loadScripts = async () => {
    try {
      setLoading(true);
      const { data: scriptData, error } = await supabase
        .from("scripts")
        .select(`
          id,
          title,
          created_at,
          admin_id,
          github_repo,
          github_owner,
          profiles (
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to include proper username handling
      const transformedScripts = scriptData.map(script => ({
        id: script.id,
        title: script.title,
        admin_id: script.admin_id,
        github_repo: script.github_repo || "",
        github_owner: script.github_owner || "",
        created_at: script.created_at,
        is_private: script.is_private,
        profiles: {
          username: script.profiles?.username || "Unknown user"
        }
      }));

      setScripts(transformedScripts);
    } catch (error) {
      console.error("Error loading scripts:", error);
      toast.error("Failed to load scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a script");
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("scripts")
        .insert({
          title,
          admin_id: user.id,
          is_private: isPrivate,
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        toast.success("Script created successfully");
        setTitle("");
        loadScripts();
        
        // Navigate to edit page
        navigate(`/script/${data[0].id}`);
      }
    } catch (error) {
      console.error("Error creating script:", error);
      toast.error("Failed to create script");
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">All Scripts</h1>

      {user && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Script</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Script title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-2"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="mr-2"
                  />
                  Private
                </label>
              </div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Loading scripts...</div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No scripts found</p>
          {!user && (
            <p className="mt-4">
              <Link to="/auth" className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              to create your own scripts
            </p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => (
            <Card key={script.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-xl">{script.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  By {script.profiles.username}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground mb-4">
                  Created on{" "}
                  {new Date(script.created_at).toLocaleDateString()}
                </p>
                <Button asChild className="w-full">
                  <Link to={`/script/${script.id}`}>View Script</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
