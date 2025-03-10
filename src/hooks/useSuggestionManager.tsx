import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { isDeltaObject } from '@/utils/editor';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);
  const [originalContent, setOriginalContent] = useState<string | any>('');
  const { toast } = useToast();

  const fetchScriptContent = async () => {
    try {
      const { data, error } = await supabase
        .from('script_content')
        .select('id, line_number, content')
        .eq('script_id', scriptId)
        .order('line_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching script content:', error);
      return [];
    }
  };

  const loadSuggestions = async () => {
    try {
      const currentScriptContent = await fetchScriptContent();
      
      const contentByUuid = new Map();
      if (currentScriptContent) {
        currentScriptContent.forEach(line => {
          if (line && typeof line === 'object' && 'id' in line && 'content' in line) {
            contentByUuid.set(line.id, line.content);
          }
        });
      }
      
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
      
      const filteredSuggestions = (data || []).filter(suggestion => {
        if (!suggestion.line_uuid || !contentByUuid.has(suggestion.line_uuid)) {
          return true;
        }
        
        const currentContent = contentByUuid.get(suggestion.line_uuid);
        return suggestion.content !== currentContent;
      });
      
      console.log(`Filtered ${data?.length || 0} suggestions to ${filteredSuggestions.length} with changes`);
      
      setSuggestions(filteredSuggestions);
      
      const grouped = SuggestionGroupManager.groupByUser(filteredSuggestions);
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
        const { data: suggestionData, error: suggestionError } = await supabase
          .from('script_suggestions')
          .select('*')
          .eq('id', id)
          .single();

        if (suggestionError) throw suggestionError;
        if (!suggestionData) throw new Error('Suggestion not found');

        console.log('Processing suggestion:', {
          id: suggestionData.id,
          line_uuid: suggestionData.line_uuid,
          content_preview: typeof suggestionData.content === 'string' 
            ? suggestionData.content.substring(0, 50) 
            : '(complex content)'
        });

        if (suggestionData.line_uuid) {
          const { data: contentData, error: contentError } = await supabase
            .from('script_content')
            .select('edited_by')
            .eq('id', suggestionData.line_uuid)
            .single();
            
          if (contentError) {
            console.error('Error fetching content data:', contentError);
            if (contentError.code === 'PGRST116') {
              console.log('Line does not exist, creating new line');
              const { error: insertError } = await supabase
                .from('script_content')
                .insert({
                  id: suggestionData.line_uuid,
                  script_id: scriptId,
                  content: suggestionData.content,
                  line_number: suggestionData.line_number || 0,
                  edited_by: suggestionData.user_id ? [suggestionData.user_id] : []
                });
              
              if (insertError) throw insertError;
              console.log('Created new line successfully');
              continue;
            } else {
              throw contentError;
            }
          }
          
          let editedByArray = [];
          if (contentData && contentData.edited_by) {
            editedByArray = Array.isArray(contentData.edited_by) ? contentData.edited_by : [];
            
            if (suggestionData.user_id && !editedByArray.includes(suggestionData.user_id)) {
              editedByArray.push(suggestionData.user_id);
            }
          } else if (suggestionData.user_id) {
            editedByArray = [suggestionData.user_id];
          }
          
          console.log('Updating existing line with suggestion content and editedBy:', editedByArray);
          
          const { error: updateError } = await supabase
            .from('script_content')
            .update({ 
              content: suggestionData.content,
              edited_by: editedByArray,
              line_number: suggestionData.line_number || null
            })
            .eq('id', suggestionData.line_uuid);

          if (updateError) {
            console.error('Error updating script_content:', updateError);
            throw updateError;
          }
          
          console.log('Line updated successfully');
        }

        const { error: statusError } = await supabase
          .from('script_suggestions')
          .update({ status: 'approved' })
          .eq('id', id);

        if (statusError) throw statusError;
        
        console.log('Suggestion marked as approved');
      }

      setSuggestions(suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      ));
      
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
      
      loadSuggestions();
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

      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      ));
      
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
    
    if (foundSuggestion.line_uuid) {
      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('content')
          .eq('id', foundSuggestion.line_uuid)
          .single();
          
        if (error) throw error;
        
        if (data) {
          console.log('Original content fetched:', {
            type: typeof data.content,
            isDelta: isDeltaObject(data.content),
            preview: typeof data.content === 'string' 
              ? data.content.substring(0, 30) 
              : JSON.stringify(data.content).substring(0, 30)
          });
          
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
