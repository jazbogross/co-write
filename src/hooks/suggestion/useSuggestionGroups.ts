
import { useState } from 'react';
import { toast } from 'sonner';
import { fetchUserProfiles } from '@/services/suggestionService';
import { GroupedSuggestion, SuggestionGroupManager } from '@/utils/diff/SuggestionGroupManager';

export function useSuggestionGroups(suggestions: any[]) {
  const [groupedSuggestions, setGroupedSuggestions] = useState<{ userId: string; username: string; suggestions: GroupedSuggestion[] }[]>([]);
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
      
      // Group suggestions by user
      const groupedByUser: Record<string, { userId: string; username: string; suggestions: GroupedSuggestion[] }> = {};
      
      suggestions.forEach(suggestion => {
        const userId = suggestion.user_id;
        const username = usernameMap[userId] || 'Unknown user';
        
        if (!groupedByUser[userId]) {
          groupedByUser[userId] = {
            userId,
            username,
            suggestions: []
          };
        }
        
        groupedByUser[userId].suggestions.push({
          id: suggestion.id,
          userId: suggestion.user_id,
          username,
          content: suggestion.delta_diff,
          status: suggestion.status,
          created_at: suggestion.created_at
        });
      });
      
      setGroupedSuggestions(Object.values(groupedByUser));
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
