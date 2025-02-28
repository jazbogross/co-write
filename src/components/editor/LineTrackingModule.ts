
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: ReactQuill.Quill) {
      let isUpdating = false;
      let lineUuids: Map<number, string> = new Map();
      let isInitialized = false;
      
      // Remove the setTimeout and initializeUuids will be called
      // only when we explicitly call quill.lineTracking.initializeUuids
      const initializeUuids = () => {
        // Don't early return if already initialized - allow forced reinitialization
        const lines = quill.getLines(0);
        let foundUuids = false;
        
        lines.forEach((line: any, index: number) => {
          if (line.domNode) {
            const uuid = line.domNode.getAttribute('data-line-uuid');
            if (uuid) {
              lineUuids.set(index, uuid);
              foundUuids = true;
            }
          }
        });
        
        // Only mark as initialized if we actually found UUIDs
        if (foundUuids) {
          isInitialized = true;
          console.log('LineTracking: Initialized with UUIDs', Array.from(lineUuids.entries()));
        } else {
          console.log('LineTracking: No UUIDs found during initialization');
        }
        
        return foundUuids;
      };
      
      quill.on('text-change', function() {
        if (isUpdating) return;
        isUpdating = true;
        
        try {
          // Make sure UUIDs are initialized, but don't force it
          // This will attempt to initialize only if not already initialized
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
        // Add explicit initialization method that can be called by React component
        // when it has finished rendering with database UUIDs
        initializeUuids: function() {
          return initializeUuids();
        },
        
        // Convert from 1-based (external) to 0-based (internal) when getting UUIDs
        getLineUuid: function(oneBasedIndex: number) {
          const zeroBasedIndex = oneBasedIndex - 1;
          return lineUuids.get(zeroBasedIndex);
        },
        
        // Convert from 1-based (external) to 0-based (internal) when setting UUIDs
        setLineUuid: function(oneBasedIndex: number, uuid: string) {
          const zeroBasedIndex = oneBasedIndex - 1;
          // Only set UUID if it doesn't already exist in the map or DOM
          if (!lineUuids.has(zeroBasedIndex)) {
            lineUuids.set(zeroBasedIndex, uuid);
            const lines = quill.getLines(0);
            if (lines[zeroBasedIndex] && lines[zeroBasedIndex].domNode) {
              // Only set if the DOM element doesn't already have a uuid
              if (!lines[zeroBasedIndex].domNode.getAttribute('data-line-uuid')) {
                lines[zeroBasedIndex].domNode.setAttribute('data-line-uuid', uuid);
              }
            }
          }
        },
        
        // Get the current state of UUID map for debugging
        getUuidMap: function() {
          return Array.from(lineUuids.entries());
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
