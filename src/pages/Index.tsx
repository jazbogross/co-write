
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ScriptCardGrid } from '@/components/scripts/ScriptCardGrid';
import { LoadingScriptCards } from '@/components/scripts/LoadingScriptCards';
import { NoScriptsFound } from '@/components/scripts/NoScriptsFound';
import { useScripts } from '@/hooks/useScripts';

export const Index: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  
  // Debug logging
  console.log("🏠 INDEX: Component rendering", { 
    authLoading, 
    userExists: !!user, 
    userId: user?.id 
  });

  const {
    publicScripts,
    yourScripts,
    isLoading,
    fetchError,
    fetchScripts
  } = useScripts(authLoading ? undefined : user?.id || null);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Script Library</h2>
        {user && (
          <Button asChild>
            <Link to="/profile">Manage Your Scripts</Link>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <LoadingScriptCards />
      ) : (
        <div className="space-y-12">
          {user && yourScripts.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-4">Your Scripts</h3>
              <ScriptCardGrid 
                scripts={yourScripts} 
                isLoggedIn={!!user} 
              />
            </section>
          )}
          
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold">Public Scripts</h3>
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
              <ScriptCardGrid 
                scripts={publicScripts} 
                isLoggedIn={!!user} 
                showPrivateIndicator={false} 
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Index;
