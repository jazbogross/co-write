
import React, { useState } from 'react';
import { DeltaEditor } from './DeltaEditor';
import { SuggestionManager } from './SuggestionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({ scriptId, isAdmin }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Handler for when suggestions are applied
  const handleSuggestionApplied = () => {
    // Increment key to force refresh of editor content
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="w-full">
      {isAdmin ? (
        <Tabs defaultValue="editor">
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>
          <TabsContent value="editor">
            <DeltaEditor 
              key={`editor-${refreshKey}`} 
              scriptId={scriptId} 
              isAdmin={isAdmin} 
            />
          </TabsContent>
          <TabsContent value="suggestions">
            <SuggestionManager 
              scriptId={scriptId} 
              onSuggestionApplied={handleSuggestionApplied} 
            />
          </TabsContent>
        </Tabs>
      ) : (
        <DeltaEditor scriptId={scriptId} isAdmin={isAdmin} />
      )}
    </div>
  );
};
