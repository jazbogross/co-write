
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SuggestionList } from './SuggestionList';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  const [content, setContent] = useState(originalContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const githubAccessToken = session.provider_token;
        if (!githubAccessToken) {
          throw new Error('GitHub OAuth access token is missing');
        }

        const response = await supabase.functions.invoke('commit-script-changes', {
          body: {
            scriptId,
            content,
            githubAccessToken,
          }
        });

        if (response.error) throw response.error;

        onSuggestChange(content);
        toast({
          title: "Changes saved",
          description: "Your changes have been committed successfully",
        });
      } else {
        const response = await supabase.functions.invoke('create-change-suggestion', {
          body: {
            scriptId,
            content,
          }
        });

        if (response.error) throw response.error;

        toast({
          title: "Suggestion submitted",
          description: "Your suggestion has been submitted for review",
        });
        
        setContent(originalContent);
      }
    } catch (error: any) {
      console.error('Error submitting changes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pages = Math.ceil(content.split('\n').length / 32);

  return (
    <div className="flex min-h-screen bg-editor-background text-white">
      <div className="flex-1 py-8 overflow-auto">
        <div className="w-a4 mx-auto space-y-8">
          {Array.from({ length: pages }).map((_, index) => (
            <div
              key={index}
              className="bg-editor-page shadow-lg p-8 min-h-a4-page"
            >
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-transparent border-none font-mono text-sm leading-relaxed text-black resize-none focus:outline-none focus:ring-0"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
                placeholder="Enter your text here..."
              />
            </div>
          ))}
        </div>
        <div className="w-a4 mx-auto mt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              isAdmin ? "Committing..." : "Submitting..."
            ) : (
              isAdmin ? "Save Changes" : "Suggest Changes"
            )}
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className={`transition-all duration-300 ${isSuggestionsOpen ? 'w-80' : 'w-12'}`}>
          <div className="h-full bg-gray-800 border-l border-gray-700">
            <button
              onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
              className="w-full p-3 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              {isSuggestionsOpen ? <ChevronRight /> : <ChevronLeft />}
            </button>
            {isSuggestionsOpen && (
              <div className="p-4">
                <SuggestionList scriptId={scriptId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
