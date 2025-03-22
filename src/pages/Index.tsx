
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { LoadingScriptCards } from '@/components/scripts/LoadingScriptCards';
import { NoScriptsFound } from '@/components/scripts/NoScriptsFound';
import { useScripts } from '@/hooks/useScripts';
import { useSession } from '@supabase/auth-helpers-react';
import { ScriptsTable } from '@/components/scripts/ScriptsTable';

export const Index: React.FC = () => {
  const session = useSession();
  const user = session?.user;
  
  // Debug logging
  console.log("🏠 INDEX: Component rendering", { 
    userExists: !!user, 
    userId: user?.id 
  });

  const {
    publicScripts,
    isLoading,
    fetchError,
    fetchScripts
  } = useScripts(user?.id || null);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Rewrite Scripts</h2>
        {user && (
          <Button asChild>
            <Link to="/profile">My Profile</Link>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <LoadingScriptCards />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <Button 
              onClick={() => fetchScripts()}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {publicScripts.length === 0 ? (
            <NoScriptsFound 
              fetchError={fetchError} 
              onRetry={fetchScripts} 
            />
          ) : (
            <ScriptsTable 
              scripts={publicScripts} 
              isLoggedIn={!!user} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
