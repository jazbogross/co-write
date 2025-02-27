
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: any) {
      quill.on('text-change', function() {
        const lines = quill.getLines(0);
        lines.forEach((line: any, index: number) => {
          if (line.domNode) {
            line.domNode.setAttribute('data-line-index', String(index));
            // Removed the class addition to avoid unnecessary classes
          }
        });
      });
    });
  }
};

// This is how we'll configure the module in TextEditor
export const EDITOR_MODULES = {
  toolbar: false,
  lineTracking: true
};
