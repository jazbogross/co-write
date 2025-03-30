
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
   * Get the summary text for a suggestion
   * @param suggestion The suggestion to summarize
   * @returns A text summary of the suggestion
   */
  static getSuggestionSummary(suggestion: Suggestion): string {
    if (!suggestion.deltaDiff) {
      return 'No changes';
    }
    
    try {
      const ops = suggestion.deltaDiff.ops || [];
      let summary = '';
      let charCount = 0;
      
      for (const op of ops) {
        if (op.insert) {
          const text = typeof op.insert === 'string' ? op.insert : JSON.stringify(op.insert);
          summary += text;
          charCount += text.length;
          
          if (charCount > 100) {
            summary = summary.substring(0, 100) + '...';
            break;
          }
        }
      }
      
      return summary || 'No text content';
    } catch (error) {
      console.error('Error creating suggestion summary:', error);
      return 'Error parsing suggestion';
    }
  }
}
