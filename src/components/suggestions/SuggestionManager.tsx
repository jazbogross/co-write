
import React from 'react';
import { SuggestionList } from './SuggestionList';
import { SuggestionPreview } from './SuggestionPreview';
import { RejectionDialog } from './RejectionDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Suggestion } from './types';
import { fetchSuggestions, fetchUserProfiles, fetchOriginalContent } from '@/services/suggestionService';
import { DeltaStatic } from 'quill';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import { useSession } from '@supabase/auth-helpers-react';

interface SuggestionManagerProps {
  scriptId: string;
  onSuggestionApplied?: () => void;
}

export const SuggestionManager: React.FC<SuggestionManagerProps> = ({ 
  scriptId, 
  onSuggestionApplied 
}) => {
  const session = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  // Load suggestions and original content
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        console.log("SuggestionManager: Loading data for script ID:", scriptId);
        
        // Load original content
        const contentData = await fetchOriginalContent(scriptId);
        setOriginalContent(contentData);
        
        // Load suggestions
        const suggestionsData = await fetchSuggestions(scriptId);
        
        if (suggestionsData && suggestionsData.length > 0) {
          // Get unique user IDs from suggestions
          const userIds = [...new Set(suggestionsData.map(suggestion => suggestion.user_id))];
          
          // Fetch usernames for these user IDs
          const usernameMap = await fetchUserProfiles(userIds);
          
          // Format suggestions with usernames
          const formattedSuggestions: Suggestion[] = suggestionsData.map((item: any) => {
            // Ensure we properly convert the delta_diff to a Delta object
            const diffDelta = safeToDelta(item.delta_diff);
              
            return {
              id: item.id,
              userId: item.user_id,
              username: usernameMap[item.user_id] || 'Unknown user',
              deltaDiff: diffDelta,
              createdAt: item.created_at,
              status: item.status as 'pending' | 'approved' | 'rejected'
            };
          });
          
          setSuggestions(formattedSuggestions);
          console.log("SuggestionManager: Formatted suggestions:", formattedSuggestions.length);
        } else {
          console.log("SuggestionManager: No suggestions found");
          setSuggestions([]);
        }
      } catch (error) {
        console.error('SuggestionManager: Error loading suggestions:', error);
        toast.error('Failed to load suggestions');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId) {
      loadData();
    }
  }, [scriptId]);

  // Preview a suggestion
  const previewSuggestion = (suggestion: Suggestion) => {
    if (!originalContent) return;
    
    setSelectedSuggestion(suggestion);
    setPreviewOpen(true);
  };
  
  // Open rejection dialog
  const openRejectDialog = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setShowRejectionDialog(true);
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
            <SuggestionList
              suggestions={suggestions}
              onPreview={previewSuggestion}
              onReject={openRejectDialog}
              onApply={(suggestion) => previewSuggestion(suggestion)}
            />
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {selectedSuggestion && originalContent && (
        <SuggestionPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          suggestion={selectedSuggestion}
          originalContent={originalContent}
          scriptId={scriptId}
          onSuggestionApplied={onSuggestionApplied}
          onSuccess={() => {
            // Update UI
            setSuggestions(suggestions.filter(s => s.id !== selectedSuggestion.id));
            setPreviewOpen(false);
            setSelectedSuggestion(null);
          }}
        />
      )}

      {/* Rejection Dialog */}
      {selectedSuggestion && (
        <RejectionDialog
          open={showRejectionDialog}
          onOpenChange={setShowRejectionDialog}
          suggestionId={selectedSuggestion.id}
          onSuccess={() => {
            // Update UI
            setSuggestions(suggestions.filter(s => s.id !== selectedSuggestion.id));
            setSelectedSuggestion(null);
            setShowRejectionDialog(false);
          }}
        />
      )}
    </div>
  );
};
