
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserGroup } from '@/utils/diff/SuggestionGroupManager';
import { SuggestionGroupItem } from './SuggestionGroupItem';

interface SuggestionGroupProps {
  group: UserGroup;
  onApprove: (ids: string[]) => void;
  onReject: (id: string) => void;
  onExpandItem: (id: string) => void;
}

export const SuggestionGroup: React.FC<SuggestionGroupProps> = ({
  group,
  onApprove,
  onReject,
  onExpandItem,
}) => {
  // Filter suggestions to only include pending ones for display
  const pendingSuggestions = group.suggestions.filter(
    suggestion => suggestion.status === 'pending'
  );
  
  // Don't render the group if there are no pending suggestions
  if (pendingSuggestions.length === 0) {
    return null;
  }
  
  // Function to handle approving all pending suggestions for this user
  const handleApproveAll = () => {
    const pendingIds = pendingSuggestions.map(suggestion => suggestion.id);
    if (pendingIds.length > 0) {
      onApprove(pendingIds);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            {group.user.username || "Unknown user"}
            <Badge variant="outline" className="ml-2">
              {pendingSuggestions.length} suggestion{pendingSuggestions.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          {pendingSuggestions.length > 0 && (
            <button
              onClick={handleApproveAll}
              className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            >
              Approve all
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {pendingSuggestions.map((suggestion) => (
            <SuggestionGroupItem
              key={suggestion.id}
              suggestion={suggestion}
              onApprove={() => onApprove([suggestion.id])}
              onReject={() => onReject(suggestion.id)}
              onExpand={() => onExpandItem(suggestion.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
