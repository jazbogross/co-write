
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ProfileFormProps {
  initialData: {
    email: string;
    username: string;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id, 
          username: formData.username,
          // Don't update email as it should remain fixed
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          disabled
          className="bg-gray-50"
        />
        <p className="text-sm text-muted-foreground">
          Your email cannot be changed
        </p>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your username"
        />
      </div>
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Updating..." : "Save Changes"}
      </Button>
    </form>
  );
}
