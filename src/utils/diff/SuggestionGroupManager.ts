
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export interface Suggestion {
  id: string;
  content: any;
  status: string;
  user: {
    username: string;
    id: string;
  };
}

export interface UserGroup {
  userId: string;
  username: string;
  count: number;
  suggestions: Suggestion[];
}

export interface GroupedSuggestion {
  id: string;
  content: any;
  status: string;
  user: {
    username: string;
    id: string;
  };
}

/**
 * Groups suggestions by user
 */
export const groupSuggestionsByUser = (suggestions: any[]): UserGroup[] => {
  const userMap = new Map<string, UserGroup>();
  
  suggestions.forEach(suggestion => {
    const userId = suggestion.user_id;
    const username = suggestion.profiles?.username || 'Unknown User';
    
    // Get or create the user group
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        username,
        count: 0,
        suggestions: []
      });
    }
    
    const userGroup = userMap.get(userId)!;
    
    // Create the grouped suggestion
    const groupedSuggestion: GroupedSuggestion = {
      id: suggestion.id,
      content: suggestion.delta_diff,
      status: suggestion.status,
      user: {
        username,
        id: userId
      }
    };
    
    // Add to the user's suggestions
    userGroup.suggestions.push(groupedSuggestion);
    userGroup.count++;
  });
  
  return Array.from(userMap.values()).sort((a, b) => b.count - a.count);
};
