import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X } from 'lucide-react';

interface Suggestion {
  id: string;
  content: string;
  author: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SuggestionListProps {
  suggestions: Suggestion[];
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  isAdmin,
  onApprove,
  onReject,
}) => {
  const getStatusColor = (status: Suggestion['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-editor-approved';
      case 'rejected':
        return 'bg-editor-rejected';
      default:
        return 'bg-editor-suggestion';
    }
  };

  return (
    <ScrollArea className="h-[400px] rounded-md border p-4">
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`rounded-lg p-4 ${getStatusColor(suggestion.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{suggestion.author}</span>
              {isAdmin && suggestion.status === 'pending' && (
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(suggestion.id)}
                    className="bg-white"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(suggestion.id)}
                    className="bg-white"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              {!isAdmin && (
                <span className="capitalize text-sm font-medium">
                  {suggestion.status}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-white bg-opacity-50 p-2 rounded">
              {suggestion.content}
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};