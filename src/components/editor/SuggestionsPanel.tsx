
import React, { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { SuggestionDiffView } from './SuggestionDiffView';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import { RejectionDialog } from '../suggestions/RejectionDialog';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { analyzeDeltaDifferences } from '@/utils/diff/contentDiff';
import { fetchOriginalContent } from '@/services/suggestionService';
import Delta from 'quill-delta';

interface SuggestionsPanelProps {
  scriptId: string;
  onAccept: (suggestionId: string, deltaDiff: DeltaStatic) => void;
  onClose: () => void;
}

export function SuggestionsPanel({ scriptId, onAccept, onClose }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const [diffData, setDiffData] = useState<Record<string, { original: string, suggested: string, changes: any[] }>>({});

  useEffect(() => {
    loadSuggestions();
    loadOriginalContent();
  }, [scriptId]);

  const loadOriginalContent = async () => {
    try {
      const content = await fetchOriginalContent(scriptId);
      setOriginalContent(content);
    } catch (error) {
      console.error('Error loading original content:', error);
      toast.error('Failed to load original script content');
    }
  };

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id, 
          user_id, 
          delta_diff, 
          status, 
          created_at, 
          rejection_reason
        `)
        .eq('script_id', scriptId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        const usernameMap: Record<string, string> = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            usernameMap[profile.id] = profile.username || 'Unknown user';
          });
        }
        
        setUsernames(usernameMap);
      }
      
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      toast.error('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (originalContent && suggestions.length > 0) {
      const newDiffData: Record<string, { original: string, suggested: string, changes: any[] }> = {};

      suggestions.forEach(suggestion => {
        try {
          // Create proper Delta instances for composition
          const originalDelta = new Delta(originalContent?.ops || []);
          const diffDelta = new Delta(suggestion.delta_diff?.ops || []);
          
          // Compose to get the suggested content
          const suggestedDelta = originalDelta.compose(diffDelta);
          
          // Extract plain text for comparison
          const originalText = extractPlainTextFromDelta(originalDelta);
          const suggestedText = extractPlainTextFromDelta(suggestedDelta);
          
          // Calculate line-by-line differences
          const { changes } = analyzeDeltaDifferences(originalText, suggestedText);
          
          newDiffData[suggestion.id] = {
            original: originalText,
            suggested: suggestedText,
            changes
          };
        } catch (error) {
          console.error(`Error calculating diff for suggestion ${suggestion.id}:`, error);
        }
      });

      setDiffData(newDiffData);
    }
  }, [originalContent, suggestions]);

  const handleAccept = async (suggestionId: string, deltaDiff: any) => {
    try {
      if (!originalContent) {
        toast.error('Original content not loaded');
        return;
      }

      const diffObj = safeToDelta(deltaDiff);
      
      const { error } = await supabase
        .from('script_suggestions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', suggestionId);
      
      if (error) throw error;
      
      onAccept(suggestionId, diffObj);
      
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      
      toast.success('Suggestion approved');
    } catch (err) {
      console.error('Error accepting suggestion:', err);
      toast.error('Failed to approve suggestion');
    }
  };

  const openRejectionDialog = (suggestionId: string) => {
    setCurrentSuggestionId(suggestionId);
    setIsRejectionDialogOpen(true);
  };

  const handleRejectSuccess = () => {
    if (currentSuggestionId) {
      setSuggestions(prev => prev.filter(s => s.id !== currentSuggestionId));
    }
    
    setCurrentSuggestionId(null);
    setIsRejectionDialogOpen(false);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Pending Suggestions</span>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
        <CardDescription>
          Review and manage suggestions from contributors
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading suggestions...</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-4">No pending suggestions</div>
        ) : (
          <Accordion type="single" collapsible>
            {suggestions.map((suggestion) => {
              const diff = diffData[suggestion.id] || { 
                original: '', 
                suggested: '', 
                changes: [] 
              };
              
              return (
                <AccordionItem key={suggestion.id} value={suggestion.id}>
                  <AccordionTrigger className="px-2 hover:bg-muted/50 rounded">
                    <div className="flex justify-between items-center w-full pr-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        <span>{usernames[suggestion.user_id] || 'Unknown User'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">
                          {new Date(suggestion.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-4">
                      <div className="mb-4">
                        <SuggestionDiffView 
                          originalContent={diff.original}
                          suggestedContent={diff.suggested}
                          diffChanges={diff.changes}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openRejectionDialog(suggestion.id)}
                          className="flex items-center gap-1"
                        >
                          <XCircle size={16} />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAccept(suggestion.id, suggestion.delta_diff)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle size={16} />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      <RejectionDialog
        open={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        suggestionId={currentSuggestionId || ''}
        onSuccess={handleRejectSuccess}
      />
    </Card>
  );
}
