
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import {
  fetchSuggestions,
  fetchUserProfiles,
  fetchOriginalContent,
  approveSuggestion,
  rejectSuggestion
} from '@/services/suggestionService';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const { toast } = useToast();

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all suggestions
      const suggestionsData = await fetchSuggestions(scriptId);
      
      // If we have suggestions, fetch the profiles
      if (suggestionsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(suggestionsData.map(item => item.user_id))];
        
        // Fetch user profiles for these IDs
        const usernameMap = await fetchUserProfiles(userIds);
        
        // Fetch original content for comparison
        const originalDelta = await fetchOriginalContent(scriptId);
        setOriginalContent(originalDelta);
        
        // Enhance suggestion data with username information and proper Delta objects
        const enhancedData = suggestionsData.map(suggestion => {
          // Convert delta_diff to proper Delta instance
          const diffDelta = safeToDelta(suggestion.delta_diff);
            
          return {
            ...suggestion,
            profiles: { username: usernameMap[suggestion.user_id] || 'Unknown user' },
            delta_diff: diffDelta
          };
        });
        
        setSuggestions(enhancedData);
        
        // Group suggestions by user
        const grouped = SuggestionGroupManager.groupByUser(enhancedData);
        setGroupedSuggestions(grouped);
      } else {
        setSuggestions([]);
        setGroupedSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0 || !originalContent) return;
    
    setIsProcessing(true);
    try {
      for (const id of ids) {
        // Find the suggestion in our local state
        const suggestion = suggestions.find(s => s.id === id);
        if (!suggestion) continue;
        
        // Approve the suggestion
        await approveSuggestion(
          scriptId,
          id,
          originalContent,
          suggestion.delta_diff
        );
      }

      // Update the local state
      setSuggestions(suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      ));
      
      // Re-group suggestions
      const updatedSuggestions = suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      toast({
        title: "Success",
        description: ids.length > 1 
          ? `${ids.length} suggestions approved` 
          : "Suggestion approved and changes applied",
      });
      
      // Reload suggestions to get fresh data
      loadSuggestions();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!id) return;

    setIsProcessing(true);
    try {
      await rejectSuggestion(id, reason);

      // Update the local state
      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      ));
      
      // Re-group suggestions
      const updatedSuggestions = suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      toast({
        title: "Success",
        description: "Suggestion rejected",
      });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpandSuggestion = async (id: string) => {
    // Find the suggestion in our grouped data
    let foundSuggestion: GroupedSuggestion | null = null;
    
    for (const group of groupedSuggestions) {
      const suggestion = group.suggestions.find(s => s.id === id);
      if (suggestion) {
        foundSuggestion = suggestion;
        break;
      }
    }
    
    if (!foundSuggestion) return;
    setExpandedSuggestion(foundSuggestion);
    
    // Make sure we have the latest original content for comparison
    if (!originalContent) {
      try {
        const content = await fetchOriginalContent(scriptId);
        setOriginalContent(content);
      } catch (error) {
        console.error('Error loading original content:', error);
        toast({
          title: "Error",
          description: "Failed to load original content for comparison",
          variant: "destructive",
        });
      }
    }
  };

  return {
    isLoading,
    isProcessing,
    groupedSuggestions,
    expandedSuggestion,
    originalContent,
    handleApprove,
    handleReject,
    handleExpandSuggestion,
    setExpandedSuggestion,
    loadSuggestions
  };
}
