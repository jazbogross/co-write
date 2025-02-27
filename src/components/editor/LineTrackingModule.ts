
import ReactQuill from 'react-quill';

export const LineTrackingModule = {
  addLineIds: {
    setup: function(quill: any) {
      // Use the quill instance from ReactQuill
      quill.on('text-change', function() {
        const lines = quill.getLines(0);
        lines.forEach((line: any, index: number) => {
          if (line.domNode) {
            // Set a data attribute for the line index
            line.domNode.setAttribute('data-line-index', String(index));
            
            // Create a custom class for each line to help with tracking
            line.domNode.classList.add(`quill-line-${index}`);
          }
        });
      });
    }
  }
};
