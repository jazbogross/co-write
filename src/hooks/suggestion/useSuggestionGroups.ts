
import { useMemo } from 'react';
import { Suggestion } from '@/components/suggestions/types';
import { DeltaStatic } from 'quill';
// The fetchUserProfiles function doesn't exist, removing import
// import { fetchUserProfiles } from '@/services/suggestionService';

interface SuggestionGroup {
  userId: string;
  username: string;
  suggestions: Suggestion[];
}

export const useSuggestionGroups = (suggestions: Suggestion[]) => {
  const suggestionGroups = useMemo(() => {
    const groups: Record<string, SuggestionGroup> = {};
    
    suggestions.forEach(suggestion => {
      if (!groups[suggestion.userId]) {
        groups[suggestion.userId] = {
          userId: suggestion.userId,
          username: suggestion.username || 'Unknown user',
          suggestions: []
        };
      }
      
      groups[suggestion.userId].suggestions.push(suggestion);
    });
    
    return Object.values(groups);
  }, [suggestions]);
  
  return suggestionGroups;
};
