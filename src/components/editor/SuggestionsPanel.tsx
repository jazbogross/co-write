
import React from 'react';
import { ChevronRight, ChevronLeft, List, UserRound } from 'lucide-react';
import { SuggestionList } from '../SuggestionList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className={`transition-all duration-300 ${isOpen ? 'w-[400px]' : 'w-12'}`}>
      <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col text-black">
        <button
          onClick={onToggle}
          className="w-full p-3 flex items-center justify-center hover:bg-gray-700 transition-colors text-white"
        >
          {isOpen ? <ChevronRight /> : <ChevronLeft />}
        </button>
        {isOpen && (
          <div className="p-4 flex-1 overflow-hidden flex flex-col bg-white text-black">
            <Tabs defaultValue="user" className="flex-1 flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="user" className="flex items-center">
                  <UserRound className="h-4 w-4 mr-2" />
                  By User
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center">
                  <List className="h-4 w-4 mr-2" />
                  All Suggestions
                </TabsTrigger>
              </TabsList>
              <TabsContent value="user" className="flex-1 overflow-hidden">
                <SuggestionList scriptId={scriptId} />
              </TabsContent>
              <TabsContent value="list" className="flex-1 overflow-hidden">
                <div className="text-center py-4 text-muted-foreground">
                  Coming soon: Flat list view of all suggestions
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};
