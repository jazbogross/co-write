
import React, { useState, useEffect } from 'react';
import { DeltaEditor } from './DeltaEditor';
import { SuggestionManager } from './SuggestionManager';
import { ScriptSuggestions } from './suggestions/SuggestionsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeltaStatic } from 'quill';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({ scriptId, isAdmin }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentContent, setCurrentContent] = useState<DeltaStatic>({ ops: [{ insert: '\n' }] });
  const [loadingContent, setLoadingContent] = useState(true);
  
  // Fetch the current content of the script
  useEffect(() => {
    const fetchScriptContent = async () => {
      setLoadingContent(true);
      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('content_delta')
          .eq('script_id', scriptId)
          .single();
        
        if (error) throw error;
        
        if (data?.content_delta) {
          setCurrentContent(data.content_delta as unknown as DeltaStatic);
        }
      } catch (error) {
        console.error('Error loading script content:', error);
        toast.error('Failed to load script content');
      } finally {
        setLoadingContent(false);
      }
    };
    
    if (scriptId) {
      fetchScriptContent();
    }
  }, [scriptId, refreshKey]);
  
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
            <TabsTrigger value="suggestions">Review Suggestions</TabsTrigger>
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
        <div className="space-y-8">
          <DeltaEditor 
            key={`editor-${refreshKey}`} 
            scriptId={scriptId} 
            isAdmin={isAdmin} 
          />
          
          {!loadingContent && (
            <ScriptSuggestions 
              scriptId={scriptId} 
              currentContent={currentContent} 
              isAdmin={isAdmin} 
            />
          )}
        </div>
      )}
    </div>
  );
};
