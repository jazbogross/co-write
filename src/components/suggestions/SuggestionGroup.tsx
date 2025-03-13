
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuggestionGroupItem } from './SuggestionGroupItem';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

interface GroupedSuggestion {
  id: string;
  content: any;
  status: string;
  user: {
    username: string;
  };
}

interface UserGroup {
  userId: string;
  username: string;
  count: number;
  suggestions: GroupedSuggestion[];
}

interface SuggestionGroupProps {
  group: UserGroup;
  onExpandSuggestion: (id: string) => void;
}

export const SuggestionGroup: React.FC<SuggestionGroupProps> = ({ group, onExpandSuggestion }) => {
  // Get pending suggestions count
  const pendingCount = group.suggestions.filter(
    suggestion => suggestion.status === 'pending'
  ).length;
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between">
          <span>{group.username}'s Suggestions</span>
          <span className="text-sm text-muted-foreground">
            {pendingCount} pending
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {group.suggestions.map(suggestion => (
            <SuggestionGroupItem 
              key={suggestion.id}
              suggestion={suggestion}
              onExpand={() => onExpandSuggestion(suggestion.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
