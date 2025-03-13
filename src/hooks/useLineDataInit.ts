
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { v4 as uuidv4 } from 'uuid';
import { isDeltaObject } from '@/utils/editor';

interface UseLineDataInitParams {
  scriptId: string;
  initialContent: any;
  userId: string | null;
  isAdmin?: boolean;
}

interface UseLineDataInitResult {
  lineData: LineData[];
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>;
  isLoading: boolean;
  error: Error | null;
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>;
  lastLineCountRef: React.MutableRefObject<number>;
  loadDrafts: () => Promise<void>;
  isInitialized: boolean;
}

/**
 * Hook to initialize line data from Delta content
 */
export const useLineDataInit = ({
  scriptId,
  initialContent,
  userId,
  isAdmin = false
}: UseLineDataInitParams): UseLineDataInitResult => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // References for tracking content and line count
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);
  
  // Initialize line data when content changes
  useEffect(() => {
    // Skip if already initialized or no content
    if (isInitialized || !initialContent) return;

    const initializeLineData = () => {
      try {
        // For the simplified Delta model, we just need a single LineData entry
        const newLineData: LineData[] = [{
          uuid: scriptId, // Use scriptId as the UUID for simplicity
          lineNumber: 1,
          content: isDeltaObject(initialContent) ? initialContent : { ops: [{ insert: String(initialContent) }] },
          originalAuthor: userId || null,
          editedBy: [],
          hasDraft: false
        }];

        setLineData(newLineData);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing line data:', error);
        setError(error as Error);
      }
    };

    initializeLineData();
  }, [initialContent, scriptId, isInitialized, userId]);
  
  // Function to load drafts (stub implementation)
  const loadDrafts = async (): Promise<void> => {
    if (!userId || !scriptId) return;
    
    try {
      setIsLoading(true);
      // Implementation would go here...
      console.log("Loading drafts...");
    } catch (error) {
      console.error('Error loading drafts:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    lineData,
    setLineData,
    isLoading,
    error,
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts,
    isInitialized
  };
};
