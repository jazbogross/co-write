
/**
 * SuggestionGroupManager.ts - Manages grouping of suggestions by various criteria
 */
import { DiffManager } from './DiffManager';
import { ChangedLine } from './diffManagerTypes';

export interface SuggestionUser {
  id: string;
  username: string;
}

export interface GroupedSuggestion {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  rejection_reason?: string;
  line_uuid?: string;
  line_number?: number;
  original_content?: string;
  user: SuggestionUser;
  consecutive_group?: number;
}

export interface UserGroup {
  user: SuggestionUser;
  suggestions: GroupedSuggestion[];
  consecutiveGroups: GroupedSuggestion[][];
}

export class SuggestionGroupManager {
  /**
   * Group suggestions by user
   */
  static groupByUser(suggestions: any[]): UserGroup[] {
    if (!suggestions || suggestions.length === 0) return [];
    
    // Create a map of users to their suggestions
    const userMap = new Map<string, UserGroup>();
    
    suggestions.forEach(suggestion => {
      const userId = suggestion.user_id;
      const username = suggestion.profiles?.username || 'Unknown User';
      
      // Initialize user group if it doesn't exist
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: {
            id: userId,
            username
          },
          suggestions: [],
          consecutiveGroups: []
        });
      }
      
      // Add suggestion to user's group
      const userGroup = userMap.get(userId)!;
      
      // Transform suggestion to our internal format
      const groupedSuggestion: GroupedSuggestion = {
        id: suggestion.id,
        content: suggestion.content,
        status: suggestion.status,
        rejection_reason: suggestion.rejection_reason,
        line_uuid: suggestion.line_uuid,
        line_number: suggestion.line_number || suggestion.metadata?.lineNumber,
        original_content: suggestion.original_content,
        user: userGroup.user
      };
      
      userGroup.suggestions.push(groupedSuggestion);
    });
    
    // Process consecutive groups for each user
    userMap.forEach(userGroup => {
      userGroup.consecutiveGroups = this.groupConsecutiveSuggestions(userGroup.suggestions);
    });
    
    return Array.from(userMap.values());
  }
  
  /**
   * Group consecutive suggestions within a user's suggestions
   */
  static groupConsecutiveSuggestions(suggestions: GroupedSuggestion[]): GroupedSuggestion[][] {
    if (!suggestions || suggestions.length === 0) return [];
    
    // First, filter out suggestions without line numbers and sort by line number
    const sortedSuggestions = suggestions
      .filter(s => s.line_number !== undefined)
      .sort((a, b) => (a.line_number || 0) - (b.line_number || 0));
    
    if (sortedSuggestions.length === 0) return [];
    
    const groups: GroupedSuggestion[][] = [];
    let currentGroup: GroupedSuggestion[] = [sortedSuggestions[0]];
    
    // Assign group index to first suggestion
    sortedSuggestions[0].consecutive_group = 0;
    
    for (let i = 1; i < sortedSuggestions.length; i++) {
      const prevSuggestion = sortedSuggestions[i - 1];
      const currentSuggestion = sortedSuggestions[i];
      
      // Check if current suggestion is consecutive to previous
      if (currentSuggestion.line_number === (prevSuggestion.line_number || 0) + 1) {
        // Add to current group
        currentGroup.push(currentSuggestion);
        // Assign same group index
        currentSuggestion.consecutive_group = groups.length;
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = [currentSuggestion];
        // Assign new group index
        currentSuggestion.consecutive_group = groups.length;
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // Handle any ungrouped suggestions (without line numbers)
    const ungroupedSuggestions = suggestions.filter(s => s.line_number === undefined);
    if (ungroupedSuggestions.length > 0) {
      // Each ungrouped suggestion gets its own group
      ungroupedSuggestions.forEach(suggestion => {
        suggestion.consecutive_group = groups.length;
        groups.push([suggestion]);
      });
    }
    
    return groups;
  }
  
  /**
   * Check if suggestions are related (e.g., part of the same feature change)
   */
  static areSuggestionsRelated(suggestionA: GroupedSuggestion, suggestionB: GroupedSuggestion): boolean {
    // Suggestions by the same user are related
    if (suggestionA.user.id === suggestionB.user.id) {
      // If they have consecutive group assigned and they're in the same group
      if (suggestionA.consecutive_group !== undefined && 
          suggestionB.consecutive_group !== undefined &&
          suggestionA.consecutive_group === suggestionB.consecutive_group) {
        return true;
      }
      
      // Check time proximity (would require timestamp data)
      // Check content similarity (would require NLP analysis)
    }
    
    return false;
  }
  
  /**
   * Transform ChangedLines (from DiffManager) to GroupedSuggestions
   */
  static changedLinesToSuggestions(changedLines: ChangedLine[], userId: string, username: string): GroupedSuggestion[] {
    return changedLines.map(line => ({
      id: line.lineUuid, // Using lineUuid as the suggestion ID
      content: typeof line.suggestedContent === 'string' 
        ? line.suggestedContent 
        : JSON.stringify(line.suggestedContent),
      status: 'pending',
      line_uuid: line.lineUuid,
      line_number: line.lineNumber,
      user: {
        id: userId,
        username
      }
    }));
  }
}
