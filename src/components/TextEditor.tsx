import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SuggestionList } from './SuggestionList';
import { supabase } from '@/integrations/supabase/client';

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  const [content, setContent] = useState(originalContent);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before submitting",
        variant: "destructive",
      });
      return;
    }

    if (isAdmin) {
      onSuggestChange(content);
      toast({
        title: "Changes saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('script_suggestions')
          .insert({
            script_id: scriptId,
            content: content,
            user_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Suggestion submitted",
          description: "Your suggestion has been submitted for review",
        });
        
        // Reset content to original after successful submission
        setContent(originalContent);
      } catch (error) {
        console.error('Error submitting suggestion:', error);
        toast({
          title: "Error",
          description: "Failed to submit suggestion. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px] md:min-h-[300px] font-mono text-sm"
        placeholder="Enter your text here..."
      />
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          className="w-full md:w-auto"
        >
          {isAdmin ? "Save Changes" : "Suggest Changes"}
        </Button>
      </div>
      {isAdmin && <SuggestionList scriptId={scriptId} />}
    </div>
  );
};