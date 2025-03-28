
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface SuggestionItemProps {
  suggestion: {
    id: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected' | 'draft';
    rejection_reason?: string;
    line_uuid?: string;
    profiles: {
      username: string;
    };
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const SuggestionItem = ({ suggestion, onApprove, onReject }: SuggestionItemProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100';
      case 'rejected':
        return 'bg-red-100';
      case 'draft':
        return 'bg-gray-100';
      default:
        return 'bg-yellow-50';
    }
  };

  return (
    <div className={`  p-4 ${getStatusColor(suggestion.status)}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium">
            {suggestion.profiles.username}
          </span>
          <span className="ml-2 text-sm text-muted-foreground capitalize">
            {suggestion.status}
          </span>
          {suggestion.line_uuid && (
            <span className="ml-2 text-xs text-gray-500">
              Line ID: {suggestion.line_uuid.substring(0, 8)}...
            </span>
          )}
        </div>
        {suggestion.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-green-50 hover:bg-green-100"
              onClick={() => onApprove(suggestion.id)}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-red-50 hover:bg-red-100"
              onClick={() => onReject(suggestion.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
      <pre className="whitespace-pre-wrap font-mono text-sm bg-white bg-opacity-50 p-2 rounded">
        {suggestion.content}
      </pre>
      {suggestion.rejection_reason && (
        <div className="mt-2 text-sm text-red-600">
          <strong>Rejection reason:</strong> {suggestion.rejection_reason}
        </div>
      )}
    </div>
  );
};
