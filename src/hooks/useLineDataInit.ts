
import { useState, useEffect } from 'react';
import { LineData } from '@/types/lineTypes';
import { v4 as uuidv4 } from 'uuid';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

/**
 * Hook to initialize line data from Delta content
 */
export const useLineDataInit = (
  content: any,
  scriptId: string
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize line data when content changes
  useEffect(() => {
    // Skip if already initialized or no content
    if (isInitialized || !content) return;

    const initializeLineData = () => {
      try {
        // For the simplified Delta model, we just need a single LineData entry
        const newLineData: LineData[] = [{
          uuid: scriptId, // Use scriptId as the UUID for simplicity
          lineNumber: 1,
          content: isDeltaObject(content) ? content : { ops: [{ insert: String(content) }] }
        }];

        setLineData(newLineData);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing line data:', error);
      }
    };

    initializeLineData();
  }, [content, scriptId, isInitialized]);

  return {
    lineData,
    setLineData,
    isInitialized
  };
};
