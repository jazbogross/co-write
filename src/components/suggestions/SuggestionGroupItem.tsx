
import React, { useState } from 'react';
import { GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { Button } from '@/components/ui/button';
import { Check, X, Maximize2 } from 'lucide-react';

interface SuggestionGroupItemProps {
  suggestion: GroupedSuggestion;
  onApprove: (ids: string[]) => void;
  onReject: (id: string) => void;
  onExpand: () => void;
}

export const SuggestionGroupItem: React.FC<SuggestionGroupItemProps> = ({
  suggestion,
  onApprove,
  onReject,
  onExpand
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50';
      case 'rejected':
        return 'bg-red-50';
      case 'draft':
        return 'bg-gray-50';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className={`rounded p-2 mb-2 ${getStatusColor(suggestion.status)}`}>
      <div className="flex justify-between items-start">
        <div className="text-sm">
          {suggestion.line_number && (
            <span className="text-xs text-gray-500">
              Line {suggestion.line_number}
              {suggestion.line_uuid && (
                <span className="ml-1">
                  ({suggestion.line_uuid.substring(0, 6)}...)
                </span>
              )}
            </span>
          )}
        </div>
        
        {suggestion.status === 'pending' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onExpand()}
              title="View details"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => onApprove([suggestion.id])}
              title="Approve"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onReject(suggestion.id)}
              title="Reject"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <pre className="whitespace-pre-wrap font-mono text-sm mt-2 overflow-x-auto max-h-24 bg-white bg-opacity-60 p-1 rounded text-xs">
        {suggestion.content.length > 200 
          ? `${suggestion.content.substring(0, 200)}...` 
          : suggestion.content}
      </pre>
      
      {suggestion.rejection_reason && (
        <div className="mt-2 text-xs text-red-600">
          <strong>Rejection reason:</strong> {suggestion.rejection_reason}
        </div>
      )}
    </div>
  );
};
