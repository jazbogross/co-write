
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export const LoadingScriptCards: React.FC = () => {
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
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-[180px]" /></TableCell>
              <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-[100px]" /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
