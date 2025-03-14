
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RejectionDialog } from './suggestions/RejectionDialog';
import { SuggestionGroup } from './suggestions/SuggestionGroup';
import { SuggestionDetail } from './suggestions/SuggestionDetail';
import { useSuggestionManager } from '@/hooks/useSuggestionManager';
import { UserGroup, Suggestion } from '@/utils/diff/SuggestionGroupManager';

interface SuggestionListProps {
  scriptId: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ scriptId }) => {
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  
  const {
    isLoading,
    groupedSuggestions,
    expandedSuggestion,
    originalContent,
    handleApprove,
    handleReject,
    handleExpandSuggestion,
    setExpandedSuggestion
  } = useSuggestionManager(scriptId);

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
            groupedSuggestions.map((group: UserGroup) => (
              <SuggestionGroup
                key={group.userId}
                group={group}
                onExpandSuggestion={handleExpandSuggestion}
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
        onConfirm={() => {
          if (selectedSuggestionId) {
            handleReject(selectedSuggestionId, rejectionReason);
            setIsRejectionDialogOpen(false);
            setRejectionReason('');
            setSelectedSuggestionId(null);
          }
        }}
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
            <SuggestionDetail
              suggestion={expandedSuggestion as Suggestion}
              originalContent={originalContent}
              onApprove={(id) => {
                handleApprove([id]);
                setExpandedSuggestion(null);
              }}
              onReject={(id) => {
                setSelectedSuggestionId(id);
                setIsRejectionDialogOpen(true);
                setExpandedSuggestion(null);
              }}
              onClose={() => setExpandedSuggestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
