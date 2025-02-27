
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuggestionItem } from './suggestions/SuggestionItem';
import { RejectionDialog } from './suggestions/RejectionDialog';

interface Suggestion {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  rejection_reason?: string;
  line_uuid?: string;
  profiles: {
    username: string;
  };
}

interface SuggestionListProps {
  scriptId: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ scriptId }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
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
          profiles (
            username
          )
        `)
        .eq('script_id', scriptId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'approved' | 'rejected' | 'draft'
      }));
      
      setSuggestions(typedData);
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

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
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
        const { error: updateError } = await supabase
          .from('script_content')
          .update({ 
            content: suggestionData.content,
            // Add current user to edited_by if not already there
            edited_by: supabase.rpc('append_to_edited_by', { 
              content_id: suggestionData.line_uuid,
              user_id: suggestionData.user_id 
            })
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

      // Update the local state
      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id ? { ...suggestion, status: 'approved' } : suggestion
      ));

      toast({
        title: "Success",
        description: "Suggestion approved and changes applied",
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

  const handleReject = async () => {
    if (!selectedSuggestionId || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedSuggestionId);

      if (error) throw error;

      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === selectedSuggestionId
          ? { ...suggestion, status: 'rejected', rejection_reason: rejectionReason }
          : suggestion
      ));

      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedSuggestionId(null);

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

  if (isLoading) {
    return <div className="text-center py-4">Loading suggestions...</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Suggestions</h3>
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">No suggestions yet</p>
          ) : (
            suggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={handleApprove}
                onReject={(id) => {
                  setSelectedSuggestionId(id);
                  setIsRejectionDialogOpen(true);
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <RejectionDialog
        open={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        rejectionReason={rejectionReason}
        onReasonChange={setRejectionReason}
        onConfirm={handleReject}
      />
    </div>
  );
};
