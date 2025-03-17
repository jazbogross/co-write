
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export const LoadingScriptCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="h-6 bg-gray-200 w-3/4"></div>
            <div className="h-4 bg-gray-200 w-1/2"></div>
          </CardHeader>
          <CardContent className="h-16 bg-gray-100 rounded"></CardContent>
          <CardFooter className="flex justify-between">
            <div className="h-8 bg-gray-200 w-1/4"></div>
            <div className="h-8 bg-gray-200 w-1/4"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
