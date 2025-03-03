
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
      let appliedCount = 0;
      
      // Check if lineData and lines arrays match in length
      if (lines.length !== lineData.length) {
        console.log(`**** UseLineData **** Warning: Line count mismatch - DOM lines: ${lines.length}, lineData: ${lineData.length}`);
      }
      
      // Apply UUIDs to all available lines
      const minLength = Math.min(lines.length, lineData.length);
      
      // First pass: Apply UUIDs to DOM elements
      for (let index = 0; index < minLength; index++) {
        if (lines[index].domNode && lineData[index]) {
          const uuid = lineData[index].uuid;
          // Only set if the DOM element doesn't already have a uuid or has a wrong one
          const currentUuid = lines[index].domNode.getAttribute('data-line-uuid');
          if (!currentUuid || currentUuid !== uuid) {
            console.log(`**** UseLineData **** Setting line ${index + 1} UUID: ${uuid}`);
            lines[index].domNode.setAttribute('data-line-uuid', uuid);
            appliedCount++;
          }
          
          // Always set the line index attribute
          lines[index].domNode.setAttribute('data-line-index', String(index + 1));
          
          // Ensure our tracking maps are updated
          if (editor.lineTracking && typeof editor.lineTracking.setLineUuid === 'function') {
            editor.lineTracking.setLineUuid(index + 1, uuid, editor);
          }
        }
      }
      
      console.log(`**** UseLineData **** Applied ${appliedCount} UUIDs to DOM elements`);
      
      // Make sure line tracking is initialized
      if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
      
      // Verify that UUIDs were applied
      const uuidVerificationCount = lines.filter(
        (line: any) => line.domNode && line.domNode.getAttribute('data-line-uuid')
      ).length;
      
      console.log(`**** UseLineData **** UUID verification: ${uuidVerificationCount}/${lines.length} lines have UUIDs`);
      
      // If verification failed, try forcing another UUID refresh
      if (uuidVerificationCount < minLength && editor.lineTracking) {
        console.log(`**** UseLineData **** Some UUIDs missing, forcing refresh`);
        if (typeof editor.lineTracking.refreshLineUuids === 'function') {
          editor.lineTracking.refreshLineUuids(lineData);
        }
      }
      
      return true;
    } catch (error) {
      console.error('**** UseLineData **** Error initializing editor UUIDs:', error);
      return false;
    }
  }, [isDataReady, lineData]);

  return { initializeEditor };
};
