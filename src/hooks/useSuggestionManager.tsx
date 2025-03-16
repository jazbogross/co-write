
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import Delta from 'quill-delta';
import { DeltaStatic } from 'quill';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const { toast } = useToast();

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch all suggestions without joining with profiles
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          delta_diff,
          status,
          rejection_reason,
          script_id,
          user_id,
          created_at,
          updated_at
        `)
        .eq('script_id', scriptId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If we have suggestions, fetch the profiles separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(item => item.user_id))];
        
        // Fetch user profiles for these IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
        
        // Create a mapping of user IDs to usernames
        const usernameMap: Record<string, string> = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            usernameMap[profile.id] = profile.username || 'Unknown user';
          });
        }
        
        // Fetch original content for comparison
        const { data: contentData } = await supabase
          .from('script_content')
          .select('content_delta')
          .eq('script_id', scriptId)
          .single();
        
        // Create proper Delta object from content
        let originalDelta;
        if (contentData?.content_delta) {
          const deltaObj = typeof contentData.content_delta === 'string'
            ? JSON.parse(contentData.content_delta)
            : contentData.content_delta;
          originalDelta = new Delta(deltaObj.ops || []) as unknown as DeltaStatic;
        } else {
          originalDelta = new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
        }
        
        // Store the original content
        setOriginalContent(originalDelta);
        
        // Enhance suggestion data with username information and proper Delta objects
        const enhancedData = data.map(suggestion => {
          // Convert delta_diff to proper Delta instance
          const diffDelta = typeof suggestion.delta_diff === 'string'
            ? new Delta(JSON.parse(suggestion.delta_diff).ops || [])
            : new Delta(suggestion.delta_diff.ops || []);
            
          return {
            ...suggestion,
            profiles: { username: usernameMap[suggestion.user_id] || 'Unknown user' },
            delta_diff: diffDelta
          };
        });
        
        setSuggestions(enhancedData);
        
        // Group suggestions by user
        const grouped = SuggestionGroupManager.groupByUser(enhancedData);
        setGroupedSuggestions(grouped);
      } else {
        setSuggestions([]);
        setGroupedSuggestions([]);
      }
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
    if (ids.length === 0 || !originalContent) return;
    
    setIsProcessing(true);
    try {
      for (const id of ids) {
        // Get the suggestion details first
        const { data: suggestionData, error: suggestionError } = await supabase
          .from('script_suggestions')
          .select('delta_diff, user_id')
          .eq('id', id)
          .single();

        if (suggestionError) throw suggestionError;
        if (!suggestionData) throw new Error('Suggestion not found');

        // Ensure we have a proper Delta object for the suggestion
        const diffDelta = typeof suggestionData.delta_diff === 'string'
          ? new Delta(JSON.parse(suggestionData.delta_diff).ops || [])
          : new Delta(suggestionData.delta_diff.ops || []);
          
        // Apply the diff to the original content
        const newContent = originalContent.compose(diffDelta as unknown as DeltaStatic);
        
        // Update the script_content with the new content
        const { error: updateError } = await supabase
          .from('script_content')
          .update({ 
            content_delta: JSON.parse(JSON.stringify(newContent))
          })
          .eq('script_id', scriptId);

        if (updateError) throw updateError;

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
      
      // Reload suggestions to get fresh data
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
    if (!id) return;

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
    
    // Make sure we have the latest original content for comparison
    if (!originalContent) {
      // Get the original content for comparison
      const { data } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
      
      if (data?.content_delta) {
        // Create a proper Delta object
        const deltaObj = typeof data.content_delta === 'string'
          ? JSON.parse(data.content_delta)
          : data.content_delta;
        
        setOriginalContent(new Delta(deltaObj.ops || []) as unknown as DeltaStatic);
      } else {
        setOriginalContent(new Delta([{ insert: '\n' }]) as unknown as DeltaStatic);
      }
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
    setExpandedSuggestion,
    loadSuggestions
  };
}

