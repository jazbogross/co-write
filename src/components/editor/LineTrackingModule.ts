
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: any) {
      let isUpdating = false;
      
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
            }
          });
        } finally {
          isUpdating = false;
        }
      });
    });
  }
};

// This is how we'll configure the module in TextEditor
export const EDITOR_MODULES = {
  toolbar: false,
  lineTracking: true
};
