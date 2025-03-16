
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DeltaStatic } from 'quill';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import { useSuggestionGroups } from './suggestion/useSuggestionGroups';
import { useSuggestionActions } from './suggestion/useSuggestionActions';
import {
  fetchSuggestions,
  fetchOriginalContent
} from '@/services/suggestionService';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const { toast } = useToast();

  // Initialize suggestion groups utility
  const {
    groupedSuggestions,
    expandedSuggestion,
    setExpandedSuggestion,
    handleExpandSuggestion,
    groupSuggestions
  } = useSuggestionGroups(suggestions);

  // Initialize suggestion actions utility
  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all suggestions
      const suggestionsData = await fetchSuggestions(scriptId);
      
      // If we have suggestions, fetch original content for comparison
      const originalDelta = await fetchOriginalContent(scriptId);
      setOriginalContent(originalDelta);
      
      // Enhance suggestion data with proper Delta objects
      const enhancedData = suggestionsData.map(suggestion => {
        // Convert delta_diff to proper Delta instance
        const diffDelta = safeToDelta(suggestion.delta_diff);
          
        return {
          ...suggestion,
          delta_diff: diffDelta
        };
      });
      
      setSuggestions(enhancedData);
      
      // Group suggestions by user
      await groupSuggestions(enhancedData);
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

  // Initialize suggestion actions
  const {
    isProcessing,
    handleApprove,
    handleReject
  } = useSuggestionActions(scriptId, originalContent, setSuggestions, loadSuggestions);

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

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
