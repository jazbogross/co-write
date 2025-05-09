
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingSuggestions = (
  scriptId: string | undefined, 
  isAdmin: boolean
) => {
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);

  useEffect(() => {
    if (isAdmin && scriptId) {
      checkPendingSuggestions(scriptId);
    }
  }, [scriptId, isAdmin]);

  const checkPendingSuggestions = async (scriptId: string) => {
    try {
      const { data, error, count } = await supabase
        .from('script_suggestions')
        .select('id', { count: 'exact' })
        .eq('script_id', scriptId)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      setPendingSuggestionsCount(count || 0);
    } catch (err) {
      console.error('Error checking pending suggestions:', err);
    }
  };

  return {
    pendingSuggestionsCount,
    hasPendingSuggestions: pendingSuggestionsCount > 0
  };
};
