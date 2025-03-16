
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarIcon, GitForkIcon, LockIcon, EyeIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface ScriptCardProps {
  id: string;
  title: string;
  created_at: string;
  admin_username?: string;
  is_private?: boolean;
  showPrivateIndicator?: boolean;
  isLoggedIn: boolean;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({
  id,
  title,
  created_at,
  admin_username = 'Unknown',
  is_private = false,
  showPrivateIndicator = true,
  isLoggedIn
}) => {
  // If admin_username is null or empty, use "Unknown" as fallback
  const displayUsername = admin_username || 'Unknown';
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center">
          <span className="truncate">{title}</span>
          {showPrivateIndicator && is_private && <LockIcon className="ml-2 h-4 w-4 text-amber-500" />}
        </CardTitle>
        <CardDescription className="flex items-center text-sm">
          <CalendarIcon className="mr-1 h-3 w-3" />
          {format(new Date(created_at), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{displayUsername ? displayUsername[0].toUpperCase() : '?'}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{displayUsername}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button asChild variant="secondary" size="sm">
          <Link to={`/scripts/${id}`}>
            <EyeIcon className="mr-1 h-4 w-4" />
            View
          </Link>
        </Button>
        {isLoggedIn && (
          <Button asChild size="sm">
            <Link to={`/scripts/${id}`}>
              <GitForkIcon className="mr-1 h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
