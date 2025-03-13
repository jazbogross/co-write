
import React from 'react';

interface ProfileLoadingStateProps {
  message: string;
  fetchError?: string | null;
}

export const ProfileLoadingState: React.FC<ProfileLoadingStateProps> = ({ 
  message, 
  fetchError 
}) => {
  return (
    <div className="container py-8 text-center">
      <div>{message}</div>
      {fetchError && (
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
          Debug info: {fetchError}
        </div>
      )}
    </div>
  );
};
