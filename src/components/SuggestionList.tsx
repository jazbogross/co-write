
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RejectionDialog } from './suggestions/RejectionDialog';
import { SuggestionGroup } from './suggestions/SuggestionGroup';
import { SuggestionDetail } from './suggestions/SuggestionDetail';
import { useSuggestionManager } from '@/hooks/useSuggestionManager';
import { UserGroup, Suggestion } from '@/utils/diff/SuggestionGroupManager';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';

// Define a local interface that matches SuggestionDetail's expected props
interface SuggestionForDetail {
  id: string;
  status: string;
  user: {
    username: string;
  };
  content: any;
  line_number?: number;
  rejection_reason?: string;
}

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

  // Ensure Delta objects are properly initialized
  const ensureDelta = (deltaObj: any): DeltaStatic => {
    if (deltaObj && typeof deltaObj.compose === 'function') {
      return deltaObj;
    }
    
    if (deltaObj && typeof deltaObj === 'object') {
      // Handle potential non-object ops value by checking
      const ops = Array.isArray(deltaObj.ops) ? deltaObj.ops : [];
      return new Delta(ops) as unknown as DeltaStatic;
    }
    
    return new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
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
          
          {expandedSuggestion && originalContent && (
            <SuggestionDetail
              suggestion={{
                id: expandedSuggestion.id,
                status: expandedSuggestion.status,
                user: { 
                  username: expandedSuggestion.profiles?.username || 'Unknown user' 
                },
                content: ensureDelta(expandedSuggestion.delta_diff),
                rejection_reason: expandedSuggestion.rejection_reason
              }}
              originalContent={extractPlainTextFromDelta(originalContent)}
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

// Helper function to extract plain text from Delta
const extractPlainTextFromDelta = (delta: DeltaStatic | null): string => {
  if (!delta) return '';
  
  let text = '';
  if (delta.ops && Array.isArray(delta.ops)) {
    delta.ops.forEach(op => {
      if (typeof op.insert === 'string') {
        text += op.insert;
      }
    });
  }
  
  return text;
};
