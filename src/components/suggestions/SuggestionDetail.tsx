
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

interface Suggestion {
  id: string;
  status: string;
  user: {
    username: string;
  };
  content: any;
  line_number?: number;
  rejection_reason?: string;
}

interface SuggestionDetailProps {
  suggestion: Suggestion;
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
  // Parse and normalize content for display
  const normalizeContentForDisplay = (content: any): string => {
    if (typeof content === 'string') {
      try {
        // Check if it's stringified JSON/Delta
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
          return extractPlainTextFromDelta(parsed);
        }
      } catch (e) {
        // Not JSON, use as is
        return content;
      }
      return content;
    } else if (isDeltaObject(content)) {
      return extractPlainTextFromDelta(content);
    }
    return String(content);
  };

  const displayContent = normalizeContentForDisplay(suggestion.content);

  return (
    <>
      <div className="flex items-center text-sm mb-2 text-black">
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
        <div className="text-sm font-medium mb-1 text-black">Content:</div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-2 rounded border text-black">
          {displayContent}
        </pre>
      </div>
      
      <div className="bg-gray-100 p-3 rounded border mb-4">
        <div className="text-sm font-medium mb-1 text-black">Original Content:</div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-2 rounded border text-black">
          {originalContent}
        </pre>
      </div>
      
      {suggestion.status === 'pending' && (
        <div className="flex justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            className="bg-red-50 hover:bg-red-100 text-black"
            onClick={() => onReject(suggestion.id)}
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            className="bg-green-50 hover:bg-green-100 text-black"
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
