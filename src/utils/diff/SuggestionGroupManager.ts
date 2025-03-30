
import { Suggestion } from '@/components/suggestions/types';

/**
 * Represents a group of suggestions by a single user
 */
export interface GroupedSuggestion {
  userId: string;
  username: string;
  status: string;
  content: any;
  created_at?: string;
  id: string;
}

/**
 * Utility class to group suggestions by user
 */
export class SuggestionGroupManager {
  /**
   * Group suggestions by user
   * @param suggestions Array of suggestions
   * @returns Array of grouped suggestions by user
   */
  static groupByUser(suggestions: Suggestion[]): { userId: string; username: string; suggestions: Suggestion[] }[] {
    const groupedByUser: Record<string, { userId: string; username: string; suggestions: Suggestion[] }> = {};
    
    suggestions.forEach(suggestion => {
      if (!groupedByUser[suggestion.userId]) {
        groupedByUser[suggestion.userId] = {
          userId: suggestion.userId,
          username: suggestion.username || 'Unknown user',
          suggestions: []
        };
      }
      
      groupedByUser[suggestion.userId].suggestions.push(suggestion);
    });
    
    return Object.values(groupedByUser);
  }
  
  /**
   * Get metadata for a suggestion
   * @param suggestionId The suggestion ID to look up
   * @param suggestions Array of all suggestions
   * @returns The suggestion metadata or null if not found
   */
  static getSuggestionMetadata(suggestionId: string, suggestions: Suggestion[]): Suggestion | null {
    return suggestions.find(s => s.id === suggestionId) || null;
  }
}
