
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: any) {
      let isUpdating = false;
      let lineUuids: Map<number, string> = new Map();
      let isInitialized = false;
      
      // Initialize the UUID map from the DOM on first load - but don't set UUIDs
      // This will only map existing UUIDs that were set by useLineData
      const initializeUuids = () => {
        if (isInitialized) return;
        
        console.log('**** LineTrackingModule **** Reading existing UUIDs from DOM');
        const lines = quill.getLines(0);
        lines.forEach((line: any, index: number) => {
          if (line.domNode) {
            const uuid = line.domNode.getAttribute('data-line-uuid');
            if (uuid) {
              lineUuids.set(index, uuid);
              console.log(`**** LineTrackingModule **** Mapped line ${index + 1} to UUID ${uuid}`);
            }
          }
        });
        
        isInitialized = true;
      };
      
      // Wait for the editor to be fully ready before initializing
      setTimeout(initializeUuids, 300);
      
      quill.on('text-change', function() {
        if (isUpdating) return;
        isUpdating = true;
        
        try {
          // Make sure UUIDs are initialized
          if (!isInitialized) {
            initializeUuids();
          }
          
          const lines = quill.getLines(0);
          lines.forEach((line: any, index: number) => {
            if (line.domNode) {
              // Set data-line-index to be 1-based (index + 1) to match Supabase's line_number
              const oneBasedIndex = index + 1;
              const currentIndex = line.domNode.getAttribute('data-line-index');
              if (currentIndex !== String(oneBasedIndex)) {
                line.domNode.setAttribute('data-line-index', String(oneBasedIndex));
              }
              
              // ONLY RESTORE missing UUIDs - NEVER REASSIGN existing ones
              const uuid = line.domNode.getAttribute('data-line-uuid');
              if (!uuid) {
                // If the line doesn't have a UUID in the DOM, check if we have one in our map
                const existingUuid = lineUuids.get(index);
                if (existingUuid) {
                  // Restore the UUID to the DOM if we have one
                  line.domNode.setAttribute('data-line-uuid', existingUuid);
                  console.log(`**** LineTrackingModule **** Restored UUID ${existingUuid} to line ${index + 1}`);
                }
                // If we don't have a UUID for this line, leave it blank - it will be assigned
                // in the updateLineContents function when needed
              }
              // NEVER update the map here - the UUIDs should only be assigned once
            }
          });
        } finally {
          isUpdating = false;
        }
      });
      
      // Get the delta content for a specific line
      quill.getContent = function(index: number, length: number) {
        // Get the Delta format for better formatting preservation
        const delta = quill.getContents(index, length);
        return JSON.stringify(delta);
      };
      
      // Expose methods to get and set line UUIDs
      quill.lineTracking = {
        // Convert from 1-based (external) to 0-based (internal) when getting UUIDs
        getLineUuid: function(oneBasedIndex: number) {
          const zeroBasedIndex = oneBasedIndex - 1;
          return lineUuids.get(zeroBasedIndex);
        },
        // Convert from 1-based (external) to 0-based (internal) when setting UUIDs
        setLineUuid: function(oneBasedIndex: number, uuid: string) {
          const zeroBasedIndex = oneBasedIndex - 1;
          console.log(`**** LineTrackingModule **** Setting UUID ${uuid} for line ${oneBasedIndex} (${zeroBasedIndex} zero-based)`);
          
          // Update the map
          lineUuids.set(zeroBasedIndex, uuid);
          
          // Update the DOM element if it exists
          const lines = quill.getLines(0);
          if (lines[zeroBasedIndex] && lines[zeroBasedIndex].domNode) {
            lines[zeroBasedIndex].domNode.setAttribute('data-line-uuid', uuid);
          }
        }
      };
    });
  }
};

// This is how we'll configure the module in TextEditor
export const EDITOR_MODULES = {
  toolbar: false,
  lineTracking: true,
  clipboard: {
    // Allow paste with formatting
    matchVisual: true,
  },
};
