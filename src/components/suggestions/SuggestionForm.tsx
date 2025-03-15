
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';

interface SuggestionFormProps {
  scriptId: string;
  currentContent: DeltaStatic;
  onSuggestionSubmitted?: () => void;
}

export const SuggestionForm: React.FC<SuggestionFormProps> = ({ 
  scriptId, 
  currentContent,
  onSuggestionSubmitted 
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be signed in to make suggestions');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please add a comment about your suggestion');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a Delta for the suggestion, then convert to plain object for storage
      const suggestionDelta = new Delta([{ insert: comment + "\n" }]);
      // Convert Delta to a plain JSON object that Supabase can store
      const jsonDeltaDiff = JSON.parse(JSON.stringify(suggestionDelta));
      
      const { error } = await supabase
        .from('script_suggestions')
        .insert({
          script_id: scriptId,
          user_id: user.id,
          delta_diff: jsonDeltaDiff,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success('Suggestion submitted successfully');
      setComment('');
      
      if (onSuggestionSubmitted) {
        onSuggestionSubmitted();
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggest Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign in to suggest changes to this script.</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggest Changes</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="comment" className="text-sm font-medium">
                Describe your suggestion
              </label>
              <Textarea
                id="comment"
                placeholder="Describe the changes you're suggesting..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
