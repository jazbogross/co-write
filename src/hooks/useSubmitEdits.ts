
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { saveLinesToDatabase, saveSuggestions, saveDraft, saveLineDrafts } from '@/utils/saveUtils';

export const useSubmitEdits = (
  isAdmin: boolean,
  scriptId: string,
  originalContent: string,
  content: string,
  lineData: LineData[],
  userId: string | null,
  onSuggestChange: (suggestion: string) => void
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const githubAccessToken = session.provider_token;
        if (!githubAccessToken) {
          throw new Error('GitHub OAuth access token is missing');
        }

        await saveLinesToDatabase(scriptId, lineData, content);

        const response = await supabase.functions.invoke('commit-script-changes', {
          body: {
            scriptId,
            content,
            githubAccessToken,
          }
        });

        if (response.error) throw response.error;

        onSuggestChange(content);
        toast({
          title: "Changes saved",
          description: "Your changes have been committed successfully",
        });
      } else {
        await saveSuggestions(scriptId, lineData, originalContent, userId);
        
        toast({
          title: "Suggestion submitted",
          description: "Your suggestion has been submitted for review",
        });
      }
    } catch (error: any) {
      console.error('Error submitting changes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveToSupabase = async () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        await saveDraft(scriptId, lineData, content, userId);

        toast({
          title: "Draft saved",
          description: "Your draft has been saved successfully",
        });
      } else {
        await saveLineDrafts(scriptId, lineData, originalContent, userId);

        toast({
          title: "Draft saved",
          description: "Your draft suggestions have been saved",
        });
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit, saveToSupabase };
};
