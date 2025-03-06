
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RejectionDialog } from './suggestions/RejectionDialog';
import { 
  SuggestionGroupManager, 
  GroupedSuggestion, 
  UserGroup 
} from '@/utils/diff/SuggestionGroupManager';
import { SuggestionGroup } from './suggestions/SuggestionGroup';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnifiedDiffView } from './suggestions/UnifiedDiffView';

interface SuggestionListProps {
  scriptId: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ scriptId }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
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

      // Update the local state
      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === selectedSuggestionId
          ? { ...suggestion, status: 'rejected', rejection_reason: rejectionReason }
          : suggestion
      ));
      
      // Re-group suggestions
      const updatedSuggestions = suggestions.map(suggestion =>
        suggestion.id === selectedSuggestionId
          ? { ...suggestion, status: 'rejected', rejection_reason: rejectionReason }
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

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

  if (isLoading) {
    return <div className="text-center py-4">Loading suggestions...</div>;
  }

  return (
    <div className="mt-2">
      <h3 className="text-lg font-medium mb-4">Suggestions</h3>
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {groupedSuggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">No suggestions yet</p>
          ) : (
            groupedSuggestions.map((group) => (
              <SuggestionGroup
                key={group.user.id}
                group={group}
                onApprove={handleApprove}
                onReject={(id) => {
                  setSelectedSuggestionId(id);
                  setIsRejectionDialogOpen(true);
                }}
                onExpandItem={handleExpandSuggestion}
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
      
      <Dialog 
        open={expandedSuggestion !== null} 
        onOpenChange={(open) => {
          if (!open) setExpandedSuggestion(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Suggestion Details</DialogTitle>
          </DialogHeader>
          
          {expandedSuggestion && (
            <>
              <div className="flex items-center text-sm mb-2">
                <span className="font-medium mr-2">Author:</span>
                {expandedSuggestion.user.username}
                
                <span className="font-medium mx-2">Status:</span>
                <span className={`capitalize ${
                  expandedSuggestion.status === 'approved' ? 'text-green-600' :
                  expandedSuggestion.status === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {expandedSuggestion.status}
                </span>
                
                {expandedSuggestion.line_number && (
                  <>
                    <span className="font-medium mx-2">Line:</span>
                    {expandedSuggestion.line_number}
                  </>
                )}
              </div>
              
              <div className="bg-gray-50 p-3 rounded border mb-4">
                <div className="text-sm font-medium mb-1">Content:</div>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-2 rounded border">
                  {expandedSuggestion.content}
                </pre>
              </div>
              
              <UnifiedDiffView 
                suggestion={expandedSuggestion}
                originalContent={originalContent}
              />
              
              {expandedSuggestion.status === 'pending' && (
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    className="bg-red-50 hover:bg-red-100"
                    onClick={() => {
                      setSelectedSuggestionId(expandedSuggestion.id);
                      setIsRejectionDialogOpen(true);
                      setExpandedSuggestion(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100"
                    onClick={() => {
                      handleApprove([expandedSuggestion.id]);
                      setExpandedSuggestion(null);
                    }}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
              
              {expandedSuggestion.rejection_reason && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  <strong>Rejection reason:</strong> {expandedSuggestion.rejection_reason}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
