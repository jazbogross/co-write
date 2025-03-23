
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

interface SuggestionsPanelProps {
  scriptId: string;
  onAccept: (suggestionId: string, deltaDiff: DeltaStatic) => void;
  onClose: () => void;
}

export function SuggestionsPanel({ scriptId, onAccept, onClose }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

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
          rejection_reason,
          profiles(username)
        `)
        .eq('script_id', scriptId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      toast.error('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (suggestionId: string, deltaDiff: DeltaStatic) => {
    try {
      // Update suggestion status to accepted
      const { error } = await supabase
        .from('script_suggestions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', suggestionId);
      
      if (error) throw error;
      
      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      
      // Notify parent component
      onAccept(suggestionId, deltaDiff);
      
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

  const handleReject = async (suggestionId: string, reason: string) => {
    try {
      // Update suggestion status to rejected with reason
      const { error } = await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', suggestionId);
      
      if (error) throw error;
      
      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      
      toast.success('Suggestion rejected');
    } catch (err) {
      console.error('Error rejecting suggestion:', err);
      toast.error('Failed to reject suggestion');
    } finally {
      setIsRejectionDialogOpen(false);
      setCurrentSuggestionId(null);
    }
  };

  // Generate diff data for SuggestionDiffView
  const generateDiffData = (deltaDiff: DeltaStatic) => {
    // Convert Delta to plain text for diffing
    const diffText = extractPlainTextFromDelta(deltaDiff);
    // Use empty string as original for now (we'll need actual original content later)
    const originalText = '';
    
    // Generate diff changes (this would normally compare two texts)
    const { changes } = analyzeDeltaDifferences(originalText, diffText);
    
    return {
      originalContent: originalText,
      suggestedContent: diffText,
      diffChanges: changes
    };
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
            {suggestions.map((suggestion) => (
              <AccordionItem key={suggestion.id} value={suggestion.id}>
                <AccordionTrigger className="px-2 hover:bg-muted/50 rounded">
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span>{suggestion.profiles?.username || 'Unknown User'}</span>
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
                    {/* Use the proper props for SuggestionDiffView */}
                    {suggestion.delta_diff && (
                      <SuggestionDiffView 
                        originalContent=""
                        suggestedContent={extractPlainTextFromDelta(safeToDelta(suggestion.delta_diff))}
                        diffChanges={generateDiffData(safeToDelta(suggestion.delta_diff)).diffChanges}
                      />
                    )}
                    
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
                        onClick={() => handleAccept(suggestion.id, safeToDelta(suggestion.delta_diff))}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Accept
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      {/* Fix the RejectionDialog props */}
      <RejectionDialog
        open={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        suggestionId={currentSuggestionId || ''}
        onSuccess={() => {
          setCurrentSuggestionId(null);
          setIsRejectionDialogOpen(false);
        }}
      />
    </Card>
  );
}
