
import { useState } from 'react';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { toast } from 'sonner';
import { fetchUserProfiles } from '@/services/suggestionService';

export function useSuggestionGroups(suggestions: any[]) {
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);

  const groupSuggestions = async (suggestions: any[]) => {
    if (suggestions.length === 0) {
      setGroupedSuggestions([]);
      return;
    }

    try {
      // Get unique user IDs
      const userIds = [...new Set(suggestions.map(item => item.user_id))];
      
      // Fetch user profiles for these IDs
      const usernameMap = await fetchUserProfiles(userIds);
      
      // Enhance suggestion data with username information
      const enhancedData = suggestions.map(suggestion => ({
        ...suggestion,
        profiles: { username: usernameMap[suggestion.user_id] || 'Unknown user' }
      }));
      
      // Group suggestions by user
      const grouped = SuggestionGroupManager.groupByUser(enhancedData);
      setGroupedSuggestions(grouped);
    } catch (error) {
      console.error('Error grouping suggestions:', error);
      toast.error("Failed to group suggestions");
    }
  };

  const handleExpandSuggestion = (id: string) => {
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
  };

  return {
    groupedSuggestions,
    expandedSuggestion,
    setExpandedSuggestion,
    handleExpandSuggestion,
    groupSuggestions
  };
}
