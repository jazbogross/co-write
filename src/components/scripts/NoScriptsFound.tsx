
import React from 'react';
import { Button } from '@/components/ui/button';

interface NoScriptsFoundProps {
  fetchError: string | null;
  onRetry: () => void;
}

export const NoScriptsFound: React.FC<NoScriptsFoundProps> = ({ fetchError, onRetry }) => {
  return (
    <div className="text-center py-10 bg-gray-50   border border-gray-200">
      <h4 className="text-xl font-medium text-gray-600 mb-4">No public scripts available</h4>
      {fetchError && (
        <div className="mt-2 p-4 bg-red-50 text-red-800 mb-4 max-w-md mx-auto">
          {fetchError}
        </div>
      )}
      <div className="max-w-md mx-auto">
        <p className="text-gray-500 mb-4">
          This could be because:
        </p>
        <ul className="list-disc text-left pl-8 mb-4 text-gray-500">
          <li>No one has created public scripts yet</li>
          <li>Scripts exist but are marked as private</li>
          <li>There was an error loading the scripts</li>
        </ul>
      </div>
      <Button 
        onClick={onRetry}
        variant="default"
        className="mt-2"
      >
        Retry Loading Scripts
      </Button>
    </div>
  );
};
