
import React from 'react';
import { ScriptCard, ScriptCardProps } from './ScriptCard';

interface ScriptCardGridProps {
  scripts: Omit<ScriptCardProps, 'isLoggedIn'>[];
  isLoggedIn: boolean;
  showPrivateIndicator?: boolean;
}

export const ScriptCardGrid: React.FC<ScriptCardGridProps> = ({ 
  scripts, 
  isLoggedIn,
  showPrivateIndicator = true 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scripts.map((script) => (
        <ScriptCard 
          key={script.id} 
          {...script} 
          isLoggedIn={isLoggedIn}
          showPrivateIndicator={showPrivateIndicator}
        />
      ))}
    </div>
  );
};
