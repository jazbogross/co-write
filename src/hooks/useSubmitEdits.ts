
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { 
  saveLinesToDatabase, 
  saveSuggestions, 
  saveDraft, 
  saveLineDrafts 
} from '@/utils/saveUtils';

export const useSubmitEdits = (
  isAdmin: boolean,
  scriptId: string,
  originalContent: string,
  content: string,
  lineData: LineData[],
  userId: string | null,
  onSuggestChange: (suggestion: string) => void,
  loadDraftsForCurrentUser?: () => Promise<boolean> // Accept this from useLineData
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
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
        // Save to database first regardless of GitHub commit
        await saveLinesToDatabase(scriptId, lineData, content);
        
        try {
          // Try to get GitHub token and commit changes
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.provider_token) {
            // If we have a token, try to commit changes
            const response = await supabase.functions.invoke('commit-script-changes', {
              body: {
                scriptId,
                content,
                githubAccessToken: session.provider_token,
              }
            });

            if (response.error) {
              throw response.error;
            }
            
            toast({
              title: "Changes saved and committed",
              description: "Your changes have been saved to the database and committed to GitHub",
            });
          } else {
            // If no token, just notify that changes were saved but not committed
            toast({
              title: "Changes saved",
              description: "Changes saved to database. GitHub commit skipped - please reconnect your GitHub account to enable commits.",
              variant: "default", 
            });
          }
        } catch (commitError: any) {
          console.error('Error committing to GitHub:', commitError);
          // Still notify that changes were saved even if GitHub commit failed
          toast({
            title: "Changes saved",
            description: "Changes saved to database, but GitHub commit failed: " + (commitError.message || "Unknown error"),
            variant: "default", 
          });
        }
        
        // Update the script content in the parent component
        onSuggestChange(content);
      } else {
        // Non-admin user submitting suggestions
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
  }, [isAdmin, scriptId, lineData, content, originalContent, userId, onSuggestChange, toast]);

  const saveToSupabase = useCallback(async () => {
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
      let success = false;
      
      if (isAdmin) {
        success = await saveDraft(scriptId, lineData, content, userId);
        
        toast({
          title: "Draft saved",
          description: "Your draft has been saved successfully",
        });
      } else {
        success = await saveLineDrafts(scriptId, lineData, originalContent, userId);
        
        toast({
          title: "Draft saved",
          description: "Your draft suggestions have been saved",
        });
      }
      
      // Only load drafts AFTER saving if the save was successful
      if (success && loadDraftsForCurrentUser) {
        console.log("Loading drafts after save...");
        await loadDraftsForCurrentUser();
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
  }, [isAdmin, scriptId, lineData, content, originalContent, userId, loadDraftsForCurrentUser, toast]);

  return { isSubmitting, handleSubmit, saveToSupabase };
};
