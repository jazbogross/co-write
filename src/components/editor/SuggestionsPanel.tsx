
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
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch suggestions without joining profiles
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
        // Get unique user IDs
        const userIds = [...new Set(data.map(item => item.user_id))];
        
        // Fetch usernames in a separate query
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Create a map of user IDs to usernames
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

  const handleRejectSuccess = () => {
    // Remove rejected suggestion from local state
    if (currentSuggestionId) {
      setSuggestions(prev => prev.filter(s => s.id !== currentSuggestionId));
    }
    
    setCurrentSuggestionId(null);
    setIsRejectionDialogOpen(false);
  };

  // Generate diff data for SuggestionDiffView
  const generateDiffData = (deltaDiff: any) => {
    // Convert Delta to plain text for diffing
    const diffDelta = safeToDelta(deltaDiff);
    const diffText = extractPlainTextFromDelta(diffDelta);
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
            {suggestions.map((suggestion) => {
              const diffData = generateDiffData(suggestion.delta_diff);
              
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
                      <SuggestionDiffView 
                        originalContent={diffData.originalContent}
                        suggestedContent={diffData.suggestedContent}
                        diffChanges={diffData.diffChanges}
                      />
                      
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
              );
            })}
          </Accordion>
        )}
      </CardContent>

      {/* Fix the RejectionDialog props */}
      <RejectionDialog
        open={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        suggestionId={currentSuggestionId || ''}
        onSuccess={handleRejectSuccess}
      />
    </Card>
  );
}
