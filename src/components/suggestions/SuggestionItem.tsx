
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Suggestion } from './types';

interface SuggestionItemProps {
  suggestion: Suggestion;
  onApprove: () => void;
  onReject: () => void;
  isAdmin: boolean;
  disabled?: boolean;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  onApprove,
  onReject,
  isAdmin,
  disabled = false
}) => {
  const formattedDate = new Date(suggestion.createdAt).toLocaleString();
  
  return (
    <div className="border rounded-md p-3 bg-muted/20">
      <div className="flex justify-between items-start mb-2">
        <div>
          <Badge variant="outline" className="mb-1">
            {suggestion.status}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {formattedDate}
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex space-x-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={onApprove}
              disabled={disabled}
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={onReject}
              disabled={disabled}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
