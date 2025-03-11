import React, { useState, useEffect } from 'react';
import { UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { SuggestionGroupItem } from './SuggestionGroupItem';
import { ChevronDown, ChevronUp, User, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateLineDiff } from '@/utils/diff/contentDiff';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

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
  onExpandItem
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filteredGroups, setFilteredGroups] = useState<GroupedSuggestion[][]>([]);
  
  useEffect(() => {
    const processedGroups = group.consecutiveGroups.map(consecutiveGroup => {
      return consecutiveGroup.filter(suggestion => {
        if (suggestion.status !== 'pending') return true;
        return true;
      });
    }).filter(group => group.length > 0);
    
    setFilteredGroups(processedGroups);
  }, [group.consecutiveGroups]);
  
  const pendingCount = group.suggestions.filter(s => s.status === 'pending').length;
  const approvedCount = group.suggestions.filter(s => s.status === 'approved').length;
  const rejectedCount = group.suggestions.filter(s => s.status === 'rejected').length;
  
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleApproveAll = () => {
    const pendingSuggestionIds = group.suggestions
      .filter(s => s.status === 'pending')
      .map(s => s.id);
    onApprove(pendingSuggestionIds);
  };
  
  return (
    <div className="mb-4 border rounded-lg overflow-hidden">
      <div 
        className="bg-gray-100 p-3 flex items-center justify-between cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{group.user.username}</span>
          <Badge variant="outline" className="ml-2 text-black">
            {group.suggestions.length} suggestion{group.suggestions.length !== 1 ? 's' : ''}
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              {pendingCount} pending
            </Badge>
          )}
          {approvedCount > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
              {approvedCount} approved
            </Badge>
          )}
          {rejectedCount > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
              {rejectedCount} rejected
            </Badge>
          )}
        </div>
        
        <div className="flex items-center">
          {pendingCount > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              className="mr-2 bg-green-50 hover:bg-green-100"
              onClick={(e) => {
                e.stopPropagation();
                handleApproveAll();
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve All
            </Button>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No pending changes to show
            </div>
          ) : (
            filteredGroups.map((consecutiveGroup, groupIndex) => (
              <div key={groupIndex} className="border-l-2 border-gray-300 pl-3">
                <div className="text-sm text-gray-500 mb-2">
                  {consecutiveGroup.length > 1 
                    ? `Lines ${consecutiveGroup[0].line_number}-${consecutiveGroup[consecutiveGroup.length-1].line_number}` 
                    : consecutiveGroup[0].line_number 
                      ? `Line ${consecutiveGroup[0].line_number}` 
                      : 'Line Unknown'}
                </div>
                {consecutiveGroup.map(suggestion => (
                  <SuggestionGroupItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApprove={ids => onApprove([suggestion.id])}
                    onReject={() => onReject(suggestion.id)}
                    onExpand={() => onExpandItem(suggestion.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
