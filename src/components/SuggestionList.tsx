import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Suggestion {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  profiles: {
    username: string;
  };
}

interface SuggestionListProps {
  scriptId: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ scriptId }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          content,
          status,
          rejection_reason,
          profiles (
            username
          )
        `)
        .eq('script_id', scriptId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('script_suggestions')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id ? { ...suggestion, status: 'approved' } : suggestion
      ));

      toast({
        title: "Success",
        description: "Suggestion approved",
      });
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedSuggestionId || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from('script_suggestions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedSuggestionId);

      if (error) throw error;

      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === selectedSuggestionId
          ? { ...suggestion, status: 'rejected', rejection_reason: rejectionReason }
          : suggestion
      ));

      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedSuggestionId(null);

      toast({
        title: "Success",
        description: "Suggestion rejected",
      });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Suggestion['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100';
      case 'rejected':
        return 'bg-red-100';
      default:
        return 'bg-yellow-50';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading suggestions...</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Suggestions</h3>
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground">No suggestions yet</p>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`rounded-lg p-4 ${getStatusColor(suggestion.status)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">
                      {suggestion.profiles.username}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground capitalize">
                      {suggestion.status}
                    </span>
                  </div>
                  {suggestion.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(suggestion.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSuggestionId(suggestion.id);
                          setIsRejectionDialogOpen(true);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-white bg-opacity-50 p-2 rounded">
                  {suggestion.content}
                </pre>
                {suggestion.rejection_reason && (
                  <div className="mt-2 text-sm text-red-600">
                    <strong>Rejection reason:</strong> {suggestion.rejection_reason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suggestion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={!rejectionReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};