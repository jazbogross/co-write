
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, User } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SuggestionForm } from './SuggestionForm';
import { DeltaStatic } from 'quill';

interface Suggestion {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ScriptSuggestionsProps {
  scriptId: string;
  currentContent: DeltaStatic;
  isAdmin: boolean;
}

export const ScriptSuggestions: React.FC<ScriptSuggestionsProps> = ({ 
  scriptId, 
  currentContent, 
  isAdmin 
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('script_suggestions')
          .select(`
            id,
            user_id,
            status,
            created_at,
            profiles:user_id (username)
          `)
          .eq('script_id', scriptId)
          .order('created_at', { ascending: false });
          
        // If user is not admin, only show their own suggestions
        if (!isAdmin && user) {
          query = query.eq('user_id', user.id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data) {
          const formattedSuggestions: Suggestion[] = data.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            username: item.profiles?.username || 'Unknown user',
            created_at: item.created_at,
            status: item.status as 'pending' | 'approved' | 'rejected'
          }));
          
          setSuggestions(formattedSuggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        toast.error('Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    };
    
    if (scriptId) {
      fetchSuggestions();
    }
  }, [scriptId, isAdmin, user, refreshTrigger]);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="space-y-6">
      <SuggestionForm 
        scriptId={scriptId} 
        currentContent={currentContent}
        onSuggestionSubmitted={handleRefresh}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Suggestions {isAdmin ? 'for Review' : 'You\'ve Made'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground">
              {isAdmin 
                ? 'No suggestions to review yet.' 
                : 'You haven\'t made any suggestions for this script.'}
            </p>
          ) : (
            <div className="space-y-4">
              {suggestions.map(suggestion => (
                <div 
                  key={suggestion.id} 
                  className="border rounded-md p-4 flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">{suggestion.username}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(suggestion.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span 
                      className={`text-sm px-2 py-1 rounded-full ${
                        suggestion.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : suggestion.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {suggestion.status === 'pending' 
                        ? 'Pending' 
                        : suggestion.status === 'approved' 
                          ? 'Approved' 
                          : 'Rejected'}
                    </span>
                  </div>
                  
                  {isAdmin && suggestion.status === 'pending' && (
                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" variant="outline">View Changes</Button>
                      <Button size="sm" variant="default">Approve</Button>
                      <Button size="sm" variant="destructive">Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
