
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
              // Only set data-line-index if it hasn't been set or has changed
              const currentIndex = line.domNode.getAttribute('data-line-index');
              if (currentIndex !== String(index)) {
                line.domNode.setAttribute('data-line-index', String(index));
              }
              
              // Get the existing UUID if available
              const uuid = line.domNode.getAttribute('data-line-uuid');
              if (uuid) {
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
        getLineUuid: function(index: number) {
          return lineUuids.get(index);
        },
        setLineUuid: function(index: number, uuid: string) {
          lineUuids.set(index, uuid);
          const lines = quill.getLines(0);
          if (lines[index] && lines[index].domNode) {
            lines[index].domNode.setAttribute('data-line-uuid', uuid);
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
