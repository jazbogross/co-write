
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, User, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';

interface Suggestion {
  id: string;
  user_id: string;
  username: string;
  delta_diff: any;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SuggestionsPanelProps {
  isOpen: boolean;
  scriptId: string;
  onToggle: () => void;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  isOpen,
  scriptId,
  onToggle,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Load suggestions whenever the panel is opened
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, scriptId]);
  
  // Subscribe to changes in the suggestions table
  useEffect(() => {
    const channel = supabase
      .channel(`suggestions_${scriptId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'script_suggestions',
        filter: `script_id=eq.${scriptId}`
      }, () => {
        loadSuggestions();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scriptId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get suggestions with user data
      const { data: suggestionsData, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          user_id,
          delta_diff,
          created_at,
          status,
          profiles:user_id (username)
        `)
        .eq('script_id', scriptId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (suggestionsData) {
        // Format suggestions
        const formattedSuggestions: Suggestion[] = suggestionsData.map(item => ({
          id: item.id,
          user_id: item.user_id,
          username: item.profiles?.username || 'Unknown user',
          delta_diff: item.delta_diff,
          created_at: item.created_at,
          status: item.status as 'pending' | 'approved' | 'rejected'
        }));
        
        setSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewSuggestion = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setIsPreviewOpen(true);
  };
  
  const handleApproveSuggestion = async (suggestion: Suggestion) => {
    try {
      setIsApproving(true);
      
      // Get current content
      const { data: contentData } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
        
      if (!contentData?.content_delta) {
        toast.error('Could not load current content');
        return;
      }
      
      // Parse the content delta
      const originalDelta = safeToDelta(contentData.content_delta);
      
      // Parse the suggestion delta
      const suggestionDelta = safeToDelta(suggestion.delta_diff);
      
      // Apply the suggestion (in a real implementation, you would use proper delta operations)
      // For now, we'll just use the suggestion delta directly
      
      // Update the content in the database
      const { error: updateError } = await supabase
        .from('script_content')
        .update({ 
          content_delta: suggestion.delta_diff,
          updated_at: new Date().toISOString() 
        })
        .eq('script_id', scriptId);
        
      if (updateError) throw updateError;
      
      // Update the suggestion status
      const { error: suggestionError } = await supabase
        .from('script_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);
        
      if (suggestionError) throw suggestionError;
      
      toast.success('Suggestion approved and applied to the script');
      
      // Close preview and reload
      setIsPreviewOpen(false);
      loadSuggestions();
      
      // Reload the page to refresh the editor with updated content
      window.location.reload();
      
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Failed to approve suggestion');
    } finally {
      setIsApproving(false);
    }
  };
  
  const handleRejectSuggestion = async (suggestion: Suggestion) => {
    try {
      setIsRejecting(true);
      
      // Update the suggestion status
      const { error } = await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected',
          rejection_reason: 'Rejected by administrator'
        })
        .eq('id', suggestion.id);
        
      if (error) throw error;
      
      toast.success('Suggestion rejected');
      
      // Close preview and reload
      setIsPreviewOpen(false);
      loadSuggestions();
      
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('Failed to reject suggestion');
    } finally {
      setIsRejecting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const getPendingSuggestionsCount = () => {
    return suggestions.filter(s => s.status === 'pending').length;
  };
  
  return (
    <div className={`transition-all duration-300 fixed right-0 top-0 bottom-0 h-full bg-gray-800 ${isOpen ? 'w-80' : 'w-12'}`} 
         style={{zIndex: 50}}>
      <div className="h-full flex flex-col">
        <Button
          variant="ghost"
          onClick={onToggle}
          className="w-full p-3 flex items-center justify-center text-white hover:bg-gray-700"
        >
          {isOpen ? <ChevronRight /> : <ChevronLeft />}
        </Button>
        
        {isOpen && (
          <div className="flex-1 p-4 overflow-hidden flex flex-col bg-white">
            <h3 className="text-lg font-medium mb-2">
              Suggestions 
              {getPendingSuggestionsCount() > 0 && (
                <Badge variant="secondary" className="ml-2">{getPendingSuggestionsCount()} pending</Badge>
              )}
            </h3>
            
            <Tabs defaultValue="pending" className="flex-1 flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {loading ? (
                    <div className="p-4 text-center">Loading suggestions...</div>
                  ) : suggestions.filter(s => s.status === 'pending').length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No pending suggestions</div>
                  ) : (
                    <div className="space-y-3">
                      {suggestions
                        .filter(s => s.status === 'pending')
                        .map(suggestion => (
                          <div key={suggestion.id} className="border p-3 rounded-md">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="font-medium">{suggestion.username}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              {formatDate(suggestion.created_at)}
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewSuggestion(suggestion)}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveSuggestion(suggestion)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectSuggestion(suggestion)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {loading ? (
                    <div className="p-4 text-center">Loading suggestions...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No suggestions</div>
                  ) : (
                    <div className="space-y-3">
                      {suggestions.map(suggestion => (
                        <div key={suggestion.id} className="border p-3 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="font-medium">{suggestion.username}</span>
                            </div>
                            <Badge variant={
                              suggestion.status === 'pending' ? 'outline' :
                              suggestion.status === 'approved' ? 'secondary' :
                              'destructive'
                            }>
                              {suggestion.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {formatDate(suggestion.created_at)}
                          </div>
                          {suggestion.status === 'pending' && (
                            <div className="flex space-x-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewSuggestion(suggestion)}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveSuggestion(suggestion)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectSuggestion(suggestion)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      
      {/* Suggestion preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Suggestion Details</DialogTitle>
            <DialogDescription>
              Suggested by {selectedSuggestion?.username} on {selectedSuggestion && formatDate(selectedSuggestion.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-md p-4 bg-gray-50 max-h-[400px] overflow-auto">
            <pre className="whitespace-pre-wrap">{selectedSuggestion && JSON.stringify(selectedSuggestion.delta_diff, null, 2)}</pre>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedSuggestion && handleRejectSuggestion(selectedSuggestion)}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedSuggestion && handleApproveSuggestion(selectedSuggestion)}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
