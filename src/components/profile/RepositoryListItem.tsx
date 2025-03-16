
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Lock, Unlock, Edit, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Repository } from './types';

export interface RepositoryListItemProps {
  repository: Repository;
  onTogglePrivacy: (repository: Repository) => void;
  onDelete: (repositoryId: string) => void;
  onOpenPermissions: (repository: Repository) => void;
  loading: boolean;
}

export const RepositoryListItem: React.FC<RepositoryListItemProps> = ({
  repository,
  onTogglePrivacy,
  onDelete,
  onOpenPermissions,
  loading
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between w-full p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex flex-col mb-2 md:mb-0">
        <div className="flex items-center">
          <Link to={`/scripts/${repository.id}`} className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            {repository.name}
          </Link>
          {repository.is_private ? (
            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900 dark:border-amber-800">
              <Lock className="h-3 w-3 mr-1" />
              Private
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 text-green-600 border-green-200 bg-green-50 dark:bg-green-900 dark:border-green-800">
              <Unlock className="h-3 w-3 mr-1" />
              Public
            </Badge>
          )}
        </div>
        {repository.created_at && (
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <Calendar className="h-3 w-3 mr-1" />
            Created {format(new Date(repository.created_at), 'MMM d, yyyy')}
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <Button 
          asChild 
          size="sm"
          variant="ghost"
        >
          <Link to={`/scripts/${repository.id}`}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenPermissions(repository)}
        >
          <Users className="h-4 w-4 mr-1" />
          Access
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTogglePrivacy(repository)}
        >
          {repository.is_private ? (
            <>
              <Unlock className="h-4 w-4 mr-1" />
              Make Public
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-1" />
              Make Private
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
