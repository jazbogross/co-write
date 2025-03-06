
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);
  const [originalContent, setOriginalContent] = useState('');
  const { toast } = useToast();

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          content,
          status,
          rejection_reason,
          line_uuid,
          line_number,
          metadata,
          user_id,
          profiles (
            username
          )
        `)
        .eq('script_id', scriptId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSuggestions(data || []);
      
      // Group suggestions by user
      const grouped = SuggestionGroupManager.groupByUser(data || []);
      setGroupedSuggestions(grouped);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    setIsProcessing(true);
    try {
      for (const id of ids) {
        // Get the suggestion details first
        const { data: suggestionData, error: suggestionError } = await supabase
          .from('script_suggestions')
          .select('*')
          .eq('id', id)
          .single();

        if (suggestionError) throw suggestionError;
        if (!suggestionData) throw new Error('Suggestion not found');

        // Update the script_content with the suggestion
        if (suggestionData.line_uuid) {
          // Get the current content to inspect existing edited_by
          const { data: contentData, error: contentError } = await supabase
            .from('script_content')
            .select('edited_by')
            .eq('id', suggestionData.line_uuid)
            .single();
            
          if (contentError) throw contentError;
          
          // Make sure we have an array
          let editedByArray = [];
          if (contentData && contentData.edited_by) {
            editedByArray = Array.isArray(contentData.edited_by) ? contentData.edited_by : [];
            
            // Only add the user if not already in the array
            if (!editedByArray.includes(suggestionData.user_id)) {
              editedByArray.push(suggestionData.user_id);
            }
          } else {
            editedByArray = [suggestionData.user_id];
          }
          
          const { error: updateError } = await supabase
            .from('script_content')
            .update({ 
              content: suggestionData.content,
              edited_by: editedByArray
            })
            .eq('id', suggestionData.line_uuid);

          if (updateError) throw updateError;
        }

        // Update suggestion status
        const { error: statusError } = await supabase
          .from('script_suggestions')
          .update({ status: 'approved' })
          .eq('id', id);

        if (statusError) throw statusError;
      }

      // Update the local state
      setSuggestions(suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      ));
      
      // Re-group suggestions
      const updatedSuggestions = suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      toast({
        title: "Success",
        description: ids.length > 1 
          ? `${ids.length} suggestions approved` 
          : "Suggestion approved and changes applied",
      });
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!id || !reason.trim()) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', id);

      if (error) throw error;

      // Update the local state
      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      ));
      
      // Re-group suggestions
      const updatedSuggestions = suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      toast({
        title: "Success",
        description: "Suggestion rejected",
      });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpandSuggestion = async (id: string) => {
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
    
    // If the suggestion has a line_uuid, fetch the original content
    if (foundSuggestion.line_uuid) {
      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('content')
          .eq('id', foundSuggestion.line_uuid)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setOriginalContent(data.content);
        }
      } catch (error) {
        console.error('Error fetching original content:', error);
        setOriginalContent('');
      }
    } else {
      setOriginalContent('');
    }
  };

  return {
    isLoading,
    isProcessing,
    groupedSuggestions,
    expandedSuggestion,
    originalContent,
    handleApprove,
    handleReject,
    handleExpandSuggestion,
    setExpandedSuggestion
  };
}
