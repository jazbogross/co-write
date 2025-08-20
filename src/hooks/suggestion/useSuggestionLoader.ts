
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Suggestion } from '@/components/suggestions/types';
import { toDelta } from '@/utils/deltaUtils';

export const useSuggestionLoader = (
  scriptId: string, 
  isAdmin: boolean
) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!isAdmin || !scriptId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          delta_diff,
          status,
          user_id,
          created_at,
          updated_at
        `)
        .eq('script_id', scriptId)
        .eq('status', 'pending');

      if (error) throw error;
      
      // Fetch usernames for each suggestion
      const userIds = [...new Set((data || []).map(item => item.user_id))];
      const userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        (users || []).forEach(user => {
          userMap[user.id] = user.username || 'Unknown user';
        });
      }
      
      // Format suggestions with username
      const formattedSuggestions = (data || []).map(suggestion => ({
        id: suggestion.id,
        userId: suggestion.user_id,
        username: userMap[suggestion.user_id] || 'Unknown user',
        deltaDiff: toDelta(suggestion.delta_diff),
        baseUpdatedAt: (suggestion.delta_diff && typeof suggestion.delta_diff === 'object' && (suggestion as any).delta_diff?.meta?.baseUpdatedAt) || null,
        createdAt: suggestion.created_at,
        status: suggestion.status as 'pending' | 'approved' | 'rejected',
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, isAdmin]);

  return { 
    suggestions, 
    setSuggestions, 
    loadSuggestions, 
    isLoading 
  };
};
