
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Suggestion } from './types';

interface SuggestionListProps {
  suggestions: Suggestion[];
  onPreview: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  onApply: (suggestion: Suggestion) => void;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  onPreview,
  onReject,
  onApply
}) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {suggestions.map((suggestion) => (
        <AccordionItem key={suggestion.id} value={suggestion.id}>
          <AccordionTrigger>
            <div className="flex justify-between w-full">
              <span>Suggestion from {suggestion.username}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(suggestion.createdAt).toLocaleDateString()}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row space-x-2 justify-end">
                <Button onClick={() => onPreview(suggestion)} variant="outline">
                  Preview
                </Button>
                <Button onClick={() => onReject(suggestion)} variant="outline">
                  Reject
                </Button>
                <Button onClick={() => onApply(suggestion)}>
                  Apply
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
