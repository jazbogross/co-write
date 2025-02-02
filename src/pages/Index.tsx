import { useState } from 'react';
import { TextEditor } from '@/components/TextEditor';
import { SuggestionList } from '@/components/SuggestionList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [isAdmin] = useState(true); // In real app, this would come from auth
  const [suggestions, setSuggestions] = useState([
    {
      id: '1',
      content: 'This is a sample suggestion',
      author: 'Editor1',
      status: 'pending',
    } as const,
  ]);

  const handleSuggestChange = (content: string) => {
    const newSuggestion = {
      id: Date.now().toString(),
      content,
      author: isAdmin ? 'Admin' : 'Editor',
      status: isAdmin ? 'approved' : 'pending',
    } as const;
    
    setSuggestions([newSuggestion, ...suggestions]);
  };

  const handleApprove = (id: string) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === id ? { ...s, status: 'approved' as const } : s
      )
    );
  };

  const handleReject = (id: string) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' as const } : s
      )
    );
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">GitHub Text Editor</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Editor</h2>
          <TextEditor
            isAdmin={isAdmin}
            originalContent="# Original Content\n\nThis is the original content of the file. Make your changes here."
            onSuggestChange={handleSuggestChange}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
          <SuggestionList
            suggestions={suggestions}
            isAdmin={isAdmin}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;