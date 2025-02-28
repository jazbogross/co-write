
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: any) {
      let isUpdating = false;
      let lineUuids: Map<number, string> = new Map();
      
      quill.on('text-change', function() {
        if (isUpdating) return;
        isUpdating = true;
        
        try {
          const lines = quill.getLines(0);
          lines.forEach((line: any, index: number) => {
            if (line.domNode) {
              // Set data-line-index to be 1-based (index + 1) to match Supabase's line_number
              const oneBasedIndex = index + 1;
              const currentIndex = line.domNode.getAttribute('data-line-index');
              if (currentIndex !== String(oneBasedIndex)) {
                line.domNode.setAttribute('data-line-index', String(oneBasedIndex));
              }
              
              // Get the existing UUID if available
              const uuid = line.domNode.getAttribute('data-line-uuid');
              if (uuid) {
                // Store in map using 0-based index for internal use
                lineUuids.set(index, uuid);
              }
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
          lineUuids.set(zeroBasedIndex, uuid);
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
