
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toDelta, toJSON } from '@/utils/deltaUtils';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';
import ReactQuill from 'react-quill';

interface Suggestion {
  id: string;
  userId: string;
  username: string;
  deltaDiff: DeltaStatic;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SuggestionManagerProps {
  scriptId: string;
  onSuggestionApplied?: () => void;
}

export const SuggestionManager: React.FC<SuggestionManagerProps> = ({ 
  scriptId, 
  onSuggestionApplied 
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  // Load suggestions and original content
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load original content
        const { data: contentData } = await supabase
          .from('script_content')
          .select('content_delta')
          .eq('script_id', scriptId)
          .single();
        
        if (contentData?.content_delta) {
          setOriginalContent(toDelta(contentData.content_delta));
        } else {
          setOriginalContent(toDelta({ ops: [{ insert: '\n' }] }));
        }
        
        // Load suggestions
        const { data: suggestionsData } = await supabase
          .from('script_suggestions')
          .select(`
            id, 
            user_id,
            delta_diff, 
            status, 
            created_at,
            profiles:user_id(username)
          `)
          .eq('script_id', scriptId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (suggestionsData) {
          const formattedSuggestions = suggestionsData.map(item => ({
            id: item.id,
            userId: item.user_id,
            username: item.profiles?.username || 'Unknown user',
            deltaDiff: toDelta(item.delta_diff),
            createdAt: item.created_at,
            status: item.status as 'pending' | 'approved' | 'rejected'
          }));
          
          setSuggestions(formattedSuggestions);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
        toast.error('Failed to load suggestions');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId) {
      loadData();
    }
  }, [scriptId]);

  // Preview a suggestion by applying the diff to the original content
  const previewSuggestion = (suggestion: Suggestion) => {
    if (!originalContent) return;
    
    setSelectedSuggestion(suggestion);
    setPreviewOpen(true);
  };

  // Apply a suggestion
  const applySuggestion = async (suggestion: Suggestion) => {
    if (!originalContent) return;
    
    setIsApplying(true);
    
    try {
      // Apply the diff to create the new content
      const newContent = originalContent.compose(suggestion.deltaDiff);
      const newContentJson = toJSON(newContent);
      
      // Update script content
      const { error: contentError } = await supabase
        .from('script_content')
        .update({
          content_delta: newContentJson,
          updated_at: new Date().toISOString()
        })
        .eq('script_id', scriptId);
      
      if (contentError) throw contentError;
      
      // Get current version
      const { data: versionData } = await supabase
        .from('script_content')
        .select('version')
        .eq('script_id', scriptId)
        .single();
      
      const newVersion = (versionData?.version || 0) + 1;
      
      // Update version number
      await supabase
        .from('script_content')
        .update({ version: newVersion })
        .eq('script_id', scriptId);
      
      // Save version history
      await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: newVersion,
          content_delta: newContentJson,
          created_at: new Date().toISOString()
        });
      
      // Update suggestion status
      await supabase
        .from('script_suggestions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestion.id);
      
      // Update UI
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
      setOriginalContent(newContent);
      setPreviewOpen(false);
      setSelectedSuggestion(null);
      
      toast.success('Suggestion applied successfully');
      
      // Notify parent component
      if (onSuggestionApplied) {
        onSuggestionApplied();
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    } finally {
      setIsApplying(false);
    }
  };

  // Open rejection dialog
  const openRejectDialog = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectionReason('');
    setShowRejectionDialog(true);
  };

  // Reject a suggestion
  const rejectSuggestion = async () => {
    if (!selectedSuggestion) return;
    
    setIsRejecting(true);
    
    try {
      // Update suggestion status
      await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSuggestion.id);
      
      // Update UI
      setSuggestions(suggestions.filter(s => s.id !== selectedSuggestion.id));
      setSelectedSuggestion(null);
      setShowRejectionDialog(false);
      
      toast.success('Suggestion rejected');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('Failed to reject suggestion');
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return <div>Loading suggestions...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Suggestions</CardTitle>
          <CardDescription>
            {suggestions.length} suggestions awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground">No pending suggestions</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {suggestions.map((suggestion) => (
                <AccordionItem key={suggestion.id} value={suggestion.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full">
                      <span>Suggestion from {suggestion.username}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(suggestion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-2">
                      <div className="flex flex-row space-x-2 justify-end">
                        <Button onClick={() => previewSuggestion(suggestion)} variant="outline">
                          Preview
                        </Button>
                        <Button onClick={() => openRejectDialog(suggestion)} variant="outline">
                          Reject
                        </Button>
                        <Button onClick={() => applySuggestion(suggestion)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {selectedSuggestion && originalContent && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Suggestion Preview</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Original Content</h3>
                <div className="bg-gray-50 min-h-[300px] p-2 rounded">
                  <ReactQuill 
                    value={originalContent}
                    readOnly
                    theme="bubble"
                  />
                </div>
              </div>
              <div className="border p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">With Suggestion Applied</h3>
                <div className="bg-gray-50 min-h-[300px] p-2 rounded">
                  <ReactQuill 
                    value={originalContent.compose(selectedSuggestion.deltaDiff)}
                    readOnly
                    theme="bubble"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setPreviewOpen(false)} variant="outline">
                Close
              </Button>
              <Button 
                onClick={() => applySuggestion(selectedSuggestion)}
                disabled={isApplying}
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suggestion</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Reason for rejection (optional):</label>
            <textarea
              className="w-full p-2 border rounded-md mt-1"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowRejectionDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={rejectSuggestion}
              disabled={isRejecting}
              variant="destructive"
            >
              Reject Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
