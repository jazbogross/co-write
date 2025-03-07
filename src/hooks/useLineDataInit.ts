
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { fetchAllLines, loadDrafts as loadDraftsFromService } from '@/services/lineDataService';
import { processLinesData } from '@/utils/lineProcessing';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, // Kept for compatibility but not primary source
  userId: string | null,
  isAdmin: boolean = false,
  originalLines: any[] = [] // Add this parameter with default empty array
) => {
  console.log('📊 useLineDataInit: Hook called with', { 
    scriptId, 
    userId, 
    isAdmin, 
    originalLinesCount: originalLines?.length || 0 
  });
  
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('📊 useLineDataInit: fetchLineData aborted: no scriptId or already initialized.');
        return;
      }
      
      console.log('📊 useLineDataInit: fetchLineData called. scriptId:', scriptId);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        // If we have originalLines from props, use them directly instead of fetching
        let allLines = originalLines;
        
        // If no originalLines provided, fetch them
        if (!originalLines || originalLines.length === 0) {
          console.log('📊 useLineDataInit: No originalLines provided, fetching from API');
          allLines = await fetchAllLines(scriptId, isAdmin);
        } else {
          console.log('📊 useLineDataInit: Using provided originalLines:', originalLines.length);
        }
        
        if (allLines && allLines.length > 0) {
          console.log('📊 useLineDataInit: Data available. Lines count:', allLines.length);
          
          // Type safe iteration over lines
          if (Array.isArray(allLines)) {
            // Log the first few lines for debugging - with safe type checking
            allLines.slice(0, 3).forEach((line, i) => {
              // Type guard to ensure line is an object with the expected properties
              if (line && typeof line === 'object') {
                // Safe access to all properties with optional chaining
                const lineId = 'id' in line ? line.id : 'unknown';
                const lineNumber = 'line_number' in line ? line.line_number : 'unknown';
                const contentType = 'content' in line && line.content !== null ? typeof line.content : 'undefined';
                const hasDraft = 'draft' in line && line.draft !== null;
                
                let contentPreview = 'non-string content';
                if ('content' in line && typeof line.content === 'string') {
                  contentPreview = line.content.substring(0, 30) + '...';
                }

                console.log(`📊 useLineDataInit: Line ${i+1}:`, {
                  id: lineId,
                  line_number: lineNumber,
                  content_type: contentType,
                  has_draft: hasDraft,
                  content_preview: contentPreview
                });
              } else {
                console.log(`📊 useLineDataInit: Line ${i+1}: Invalid format`);
              }
            });
            
            // Process the line data, passing the isAdmin flag
            const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
            
            console.log('📊 useLineDataInit: Processed line data:', processedLines.length, 'lines');
            
            // Safely log processed lines
            processedLines.slice(0, 3).forEach((line, i) => {
              if (line) {
                // Type-safe access to line content for logging
                let contentPreview: string;
                if (typeof line.content === 'string') {
                  contentPreview = line.content.substring(0, 30);
                } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
                  contentPreview = JSON.stringify(line.content).substring(0, 30);
                } else {
                  contentPreview = '[invalid content format]';
                }
                
                console.log(`📊 Processed Line ${i+1}:`, {
                  uuid: line.uuid,
                  lineNumber: line.lineNumber,
                  contentType: typeof line.content,
                  isDelta: isDeltaObject(line.content),
                  hasDraft: !!line.hasDraft,
                  preview: contentPreview
                });
              }
            });
            
            setLineData(processedLines);
            lastLineCountRef.current = processedLines.length;
          } else {
            console.error('📊 useLineDataInit: Lines are not an array', allLines);
            // Create a blank initial document if data format is incorrect
            const initialLineData = createInitialLineData("", userId);
            contentToUuidMapRef.current.set("", initialLineData[0].uuid);
            setLineData(initialLineData);
            lastLineCountRef.current = 1;
          }
        } else {
          console.log('📊 useLineDataInit: No data found, creating initial line data');
          // Create a blank initial document if none exists yet
          const initialLineData = createInitialLineData("", userId);
          
          contentToUuidMapRef.current.set("", initialLineData[0].uuid);
          
          setLineData(initialLineData);
          lastLineCountRef.current = 1;
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('📊 useLineDataInit: Data is now ready for editor to use');
      } catch (error) {
        console.error('📊 useLineDataInit: Error processing line data:', error);
        setInitialized(true);
        
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData("", userId);
          setLineData(initialLineData);
          setIsDataReady(true);
          lastLineCountRef.current = 1;
          console.log('📊 useLineDataInit: Created fallback initial line data after error');
        }
      }
    };

    fetchLineData();
  }, [scriptId, userId, initialized, lineData.length, isAdmin, originalLines]);

  // Function to handle loading drafts
  const loadUserDrafts = async (userId: string | null) => {
    console.log('📊 useLineDataInit: loadDrafts called for user:', userId, 'isAdmin:', isAdmin);
    
    if (!scriptId || !userId || isDraftLoaded) {
      console.log('📊 useLineDataInit: loadDrafts aborted: missing scriptId or userId, or drafts already loaded');
      return;
    }
    
    try {
      setIsDraftLoaded(true); // Set flag to prevent duplicate calls
      
      // Use the imported service function with proper parameters
      const updatedLines = await loadDraftsFromService(scriptId, userId, contentToUuidMapRef, isAdmin);
      
      if (updatedLines.length > 0) {
        console.log('📊 useLineDataInit: Draft lines loaded:', updatedLines.length);
        
        // Type-safe logging of draft lines
        updatedLines.slice(0, 3).forEach((line, i) => {
          if (line) {
            // Safe content preview for logging
            let contentPreview: string;
            if (typeof line.content === 'string') {
              contentPreview = line.content.substring(0, 30);
            } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
              contentPreview = JSON.stringify(line.content).substring(0, 30);
            } else {
              contentPreview = '[invalid content format]';
            }
            
            console.log(`📊 Draft Line ${i+1}:`, {
              uuid: line.uuid,
              lineNumber: line.lineNumber,
              contentType: typeof line.content,
              isDelta: isDeltaObject(line.content),
              hasDraft: line.hasDraft || false,
              preview: contentPreview
            });
          }
        });
        
        setLineData(updatedLines);
        console.log('📊 useLineDataInit: Draft lines loaded successfully:', updatedLines.length);
      } else {
        console.log('📊 useLineDataInit: No draft lines to load');
      }
    } catch (error) {
      console.error('📊 useLineDataInit: Error in loadDrafts:', error);
    }
  };

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef, 
    lastLineCountRef,
    loadDrafts: loadUserDrafts // Rename the returned function to avoid confusion
  };
};
