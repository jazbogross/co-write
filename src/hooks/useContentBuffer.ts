import { useState, useRef, useCallback } from 'react';

interface ContentBufferOptions {
  debounceTime?: number;
  minChangeInterval?: number;
}

export const useContentBuffer = (
  initialContent: string[], 
  onChange: (contents: string[]) => void,
  options: ContentBufferOptions = {}
) => {
  const [bufferContent, setBufferContent] = useState<string[]>(initialContent);
  const debounceTimerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Default options
  const debounceTime = options.debounceTime || 300; // ms
  const minChangeInterval = options.minChangeInterval || 100; // ms
  
  const updateContent = useCallback((newContent: string[]) => {
    setBufferContent(newContent);
    
    // Clear any existing timer
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // If we're updating too frequently, use the debounce timer
    if (timeSinceLastUpdate < minChangeInterval) {
      debounceTimerRef.current = window.setTimeout(() => {
        onChange(newContent);
        lastUpdateRef.current = Date.now();
        debounceTimerRef.current = null;
      }, debounceTime);
    } else {
      // Otherwise update immediately
      onChange(newContent);
      lastUpdateRef.current = now;
    }
  }, [debounceTime, minChangeInterval, onChange]);
  
  // Force an immediate update, bypassing debounce
  const flushUpdate = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      onChange(bufferContent);
      lastUpdateRef.current = Date.now();
      debounceTimerRef.current = null;
    }
  }, [bufferContent, onChange]);
  
  return {
    bufferContent,
    updateContent,
    flushUpdate
  };
};
