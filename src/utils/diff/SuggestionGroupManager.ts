
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export interface GroupedSuggestion {
  id: string;
  content: any;
  original_content?: any;
  status: string;
  rejection_reason?: string;
  created_at: string;
  user_id: string;
}

export interface UserGroup {
  user: {
    id: string;
    username: string;
  };
  count: number;
  suggestions: GroupedSuggestion[];
}

export class SuggestionGroupManager {
  /**
   * Group suggestions by user
   */
  static groupByUser(suggestions: any[]): UserGroup[] {
    if (!suggestions || suggestions.length === 0) {
      return [];
    }
    
    // Group by user_id
    const userGroups = new Map<string, UserGroup>();
    
    suggestions.forEach(suggestion => {
      const userId = suggestion.user_id;
      const username = suggestion.profiles?.username || 'Unknown user';
      
      // Skip suggestions without a user
      if (!userId) return;
      
      // Get or create user group
      if (!userGroups.has(userId)) {
        userGroups.set(userId, {
          user: {
            id: userId,
            username
          },
          count: 0,
          suggestions: []
        });
      }
      
      const group = userGroups.get(userId)!;
      
      // Add suggestion to group
      group.suggestions.push({
        id: suggestion.id,
        content: suggestion.delta_diff || suggestion.content,
        original_content: suggestion.original_content,
        status: suggestion.status,
        rejection_reason: suggestion.rejection_reason,
        created_at: suggestion.created_at,
        user_id: userId
      });
      
      // Increment count
      group.count++;
    });
    
    // Convert map to array and sort by most recent suggestion
    return Array.from(userGroups.values())
      .sort((a, b) => {
        const aDate = new Date(a.suggestions[0].created_at).getTime();
        const bDate = new Date(b.suggestions[0].created_at).getTime();
        return bDate - aDate; // Most recent first
      });
  }
  
  /**
   * Get content text for display
   */
  static getContentText(content: any): string {
    if (!content) return '';
    
    if (isDeltaObject(content)) {
      return extractPlainTextFromDelta(content);
    }
    
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (isDeltaObject(parsed)) {
          return extractPlainTextFromDelta(parsed);
        }
      } catch (e) {
        // Not JSON, use as is
      }
      
      return content;
    }
    
    return String(content);
  }
}
