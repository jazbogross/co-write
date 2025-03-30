
import React from 'react';
import { Button } from '@/components/ui/button';
import { SuggestionItem } from './SuggestionItem';
import { Suggestion } from './types';
import { GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';

interface SuggestionGroupItemProps {
  group: { userId: string; username: string; suggestions: Suggestion[] };
  onApprove: (ids: string[]) => void;
  onReject: (id: string) => void;
  isAdmin: boolean;
  disabled?: boolean;
}

export const SuggestionGroupItem: React.FC<SuggestionGroupItemProps> = ({
  group,
  onApprove,
  onReject,
  isAdmin,
  disabled = false
}) => {
  const handleApproveAll = () => {
    const ids = group.suggestions.map(s => s.id);
    onApprove(ids);
  };
  
  return (
    <div className="border rounded-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">{group.username}</h3>
        {isAdmin && group.suggestions.length > 1 && (
          <Button 
            size="sm" 
            onClick={handleApproveAll}
            disabled={disabled}
          >
            Approve All ({group.suggestions.length})
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {group.suggestions.map(suggestion => (
          <SuggestionItem 
            key={suggestion.id}
            suggestion={suggestion}
            onApprove={() => onApprove([suggestion.id])}
            onReject={() => onReject(suggestion.id)}
            isAdmin={isAdmin}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
