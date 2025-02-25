
import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SuggestionList } from '../SuggestionList';

interface SuggestionsPanelProps {
  isOpen: boolean;
  scriptId: string;
  onToggle: () => void;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  isOpen,
  scriptId,
  onToggle,
}) => {
  return (
    <div className={`transition-all duration-300 ${isOpen ? 'w-80' : 'w-12'}`}>
      <div className="h-full bg-gray-800 border-l border-gray-700">
        <button
          onClick={onToggle}
          className="w-full p-3 flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          {isOpen ? <ChevronRight /> : <ChevronLeft />}
        </button>
        {isOpen && (
          <div className="p-4">
            <SuggestionList scriptId={scriptId} />
          </div>
        )}
      </div>
    </div>
  );
};
