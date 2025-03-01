
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';

export const useEditorInit = (lineData: LineData[], isDataReady: boolean) => {
  // This function will be called by TextEditor when it's ready to initialize
  // Returns true if data is ready, false if still loading
  const initializeEditor = useCallback((editor: any): boolean => {
    if (!isDataReady || !editor) return false;
    
    console.log('**** UseLineData **** Initializing editor with UUIDs from database');
    
    try {
      // Only assign UUIDs to DOM elements if we have them from the database
      const lines = editor.getLines(0);
      lines.forEach((line: any, index: number) => {
        if (line.domNode && index < lineData.length) {
          const uuid = lineData[index].uuid;
          // Only set if the DOM element doesn't already have a uuid or has a wrong one
          const currentUuid = line.domNode.getAttribute('data-line-uuid');
          if (!currentUuid || currentUuid !== uuid) {
            console.log(`**** UseLineData **** Setting line ${index + 1} UUID: ${uuid}`);
            line.domNode.setAttribute('data-line-uuid', uuid);
            
            // Also set the line index attribute
            line.domNode.setAttribute('data-line-index', String(index + 1));
          }
          
          // Ensure our tracking maps are updated
          if (editor.lineTracking) {
            editor.lineTracking.setLineUuid(index + 1, uuid);
          }
        }
      });
      return true;
    } catch (error) {
      console.error('**** UseLineData **** Error initializing editor UUIDs:', error);
      return false;
    }
  }, [isDataReady, lineData]);

  return { initializeEditor };
};
