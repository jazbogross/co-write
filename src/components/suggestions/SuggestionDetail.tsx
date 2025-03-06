
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { UnifiedDiffView } from './UnifiedDiffView';

interface SuggestionDetailProps {
  suggestion: GroupedSuggestion;
  originalContent: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export const SuggestionDetail: React.FC<SuggestionDetailProps> = ({
  suggestion,
  originalContent,
  onApprove,
  onReject,
  onClose
}) => {
  return (
    <>
      <div className="flex items-center text-sm mb-2">
        <span className="font-medium mr-2">Author:</span>
        {suggestion.user.username}
        
        <span className="font-medium mx-2">Status:</span>
        <span className={`capitalize ${
          suggestion.status === 'approved' ? 'text-green-600' :
          suggestion.status === 'rejected' ? 'text-red-600' :
          'text-yellow-600'
        }`}>
          {suggestion.status}
        </span>
        
        {suggestion.line_number && (
          <>
            <span className="font-medium mx-2">Line:</span>
            {suggestion.line_number}
          </>
        )}
      </div>
      
      <div className="bg-gray-50 p-3 rounded border mb-4">
        <div className="text-sm font-medium mb-1">Content:</div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-2 rounded border">
          {suggestion.content}
        </pre>
      </div>
      
      <UnifiedDiffView 
        suggestion={suggestion}
        originalContent={originalContent}
      />
      
      {suggestion.status === 'pending' && (
        <div className="flex justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            className="bg-red-50 hover:bg-red-100"
            onClick={() => onReject(suggestion.id)}
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            className="bg-green-50 hover:bg-green-100"
            onClick={() => onApprove(suggestion.id)}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
        </div>
      )}
      
      {suggestion.rejection_reason && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <strong>Rejection reason:</strong> {suggestion.rejection_reason}
        </div>
      )}
    </>
  );
};
