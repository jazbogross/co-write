
/**
 * SuggestionGroupManager - Utilities for grouping suggestions by user
 */
import { DeltaContent } from '@/utils/editor/types';
import { DeltaStatic } from 'quill';

export interface Suggestion {
  id: string;
  content: string | DeltaContent;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  delta_diff: DeltaStatic;
  rejection_reason?: string;
  user: {
    username: string;
  };
  profiles?: {
    username: string;
  };
}

export interface GroupedSuggestion {
  id: string;
  content: string | DeltaContent;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  delta_diff: DeltaStatic;
  rejection_reason?: string;
  profiles?: {
    username: string;
  };
}

export interface UserGroup {
  userId: string;
  username: string;
  suggestions: GroupedSuggestion[];
  count?: number;
}

export class SuggestionGroupManager {
  /**
   * Group suggestions by user
   */
  static groupByUser(suggestions: any[]): UserGroup[] {
    // Map to store user groups
    const userGroups = new Map<string, UserGroup>();
    
    suggestions.forEach(suggestion => {
      const userId = suggestion.user_id;
      const username = suggestion.profiles?.username || 'Unknown User';
      
      if (!userGroups.has(userId)) {
        userGroups.set(userId, {
          userId,
          username,
          suggestions: [],
          count: 0
        });
      }
      
      // Add suggestion to user's group
      const group = userGroups.get(userId)!;
      group.suggestions.push({
        id: suggestion.id,
        content: suggestion.content || suggestion.delta_diff,
        status: suggestion.status,
        createdAt: suggestion.created_at,
        delta_diff: suggestion.delta_diff,
        rejection_reason: suggestion.rejection_reason,
        profiles: suggestion.profiles
      });
      group.count = group.suggestions.length;
    });
    
    // Convert map to array
    return Array.from(userGroups.values());
  }
}
