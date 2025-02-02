import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  onSuggestChange,
}) => {
  const [content, setContent] = useState(originalContent);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before submitting",
        variant: "destructive",
      });
      return;
    }
    
    onSuggestChange(content);
    toast({
      title: "Changes submitted",
      description: isAdmin ? "Changes saved successfully" : "Your suggestion has been submitted for review",
    });
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[300px] font-mono text-sm"
        placeholder="Enter your text here..."
      />
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          {isAdmin ? "Save Changes" : "Suggest Changes"}
        </Button>
      </div>
    </div>
  );
};