import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type ProfileFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

type Script = {
  id: string;
  title: string;
  created_at: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      form.setValue("email", user.email || "");
      
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
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      if (data.password && data.password !== data.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        email: data.email,
        password: data.password || undefined,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const createNewScript = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scripts")
        .insert([
          {
            title: "New Script",
            admin_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setScripts([data, ...scripts]);
        toast({
          title: "Success",
          description: "New script created",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create script",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your email and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Update Profile</Button>
            </form>
          </Form>
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
          <div className="mb-4">
            <Button onClick={createNewScript}>Create New Script</Button>
          </div>
          <div className="space-y-4">
            {scripts.map((script) => (
              <Card key={script.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{script.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(script.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/scripts/${script.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
            {scripts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No scripts created yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}