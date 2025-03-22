
import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EyeIcon, GitForkIcon, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Script } from '@/types/repository';

interface ScriptsTableProps {
  scripts: Script[];
  isLoggedIn: boolean;
}

export const ScriptsTable: React.FC<ScriptsTableProps> = ({ scripts, isLoggedIn }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scripts.map((script) => (
            <TableRow key={script.id}>
              <TableCell className="font-medium">{script.title}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{script.admin_username || 'Unknown'}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {script.created_at ? format(new Date(script.created_at), 'MMM d, yyyy') : 'Unknown date'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/scripts/${script.id}`}>
                    <EyeIcon className="mr-1 h-4 w-4" />
                    View
                  </Link>
                </Button>
                
                {isLoggedIn && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/scripts/${script.id}`}>
                      <GitForkIcon className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
