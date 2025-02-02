import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextEditor } from '@/components/TextEditor';
import { SuggestionList } from '@/components/SuggestionList';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Suggestion {
  id: string;
  content: string;
  author: string;
  status: 'pending' | 'approved' | 'rejected';
}

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    setIsAdmin(profile?.role === 'admin');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSuggestChange = (content: string) => {
    const newSuggestion: Suggestion = {
      id: Date.now().toString(),
      content,
      author: isAdmin ? 'Admin' : 'Editor',
      status: isAdmin ? 'approved' : 'pending',
    };
    
    setSuggestions([newSuggestion, ...suggestions]);
  };

  const handleApprove = (id: string) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === id ? { ...s, status: 'approved' } : s
      )
    );
  };

  const handleReject = (id: string) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' } : s
      )
    );
  };

  return (
    <div className="container px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">GitHub Text Editor</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Editor</h2>
          <TextEditor
            isAdmin={isAdmin}
            originalContent="# Original Content\n\nThis is the original content of the file. Make your changes here."
            onSuggestChange={handleSuggestChange}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
          <SuggestionList
            suggestions={suggestions}
            isAdmin={isAdmin}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;