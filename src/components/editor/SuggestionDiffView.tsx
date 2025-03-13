
import React from 'react';
import ReactQuill from 'react-quill';
import { DiffChange } from '@/utils/diff';
import 'react-quill/dist/quill.bubble.css';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges
}) => {
  return (
    <div className="border rounded-md p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Original Content</h3>
        <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap">
          {originalContent}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Suggested Content</h3>
        <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap">
          {suggestedContent}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Changes</h3>
        <div className="bg-red-50 p-3 rounded border mb-2">
          <div className="text-sm font-medium text-red-700">Removed:</div>
          <div className="line-through">{diffChanges.find(c => c.type === 'delete' || c.type === 'modify')?.originalText || 'No removals'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded border">
          <div className="text-sm font-medium text-green-700">Added:</div>
          <div>{diffChanges.find(c => c.type === 'add' || c.type === 'modify')?.text || 'No additions'}</div>
        </div>
      </div>
    </div>
  );
};
