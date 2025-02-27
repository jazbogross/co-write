
import Quill from 'quill';

export const LineTrackingModule = {
  addLineIds: {
    setup: function(quill: Quill) { // Use instance type here
      quill.on('text-change', function() {
        const lines = quill.getLines(0);
        lines.forEach((line, index) => {
          if (line.domNode) {
            line.domNode.setAttribute('data-line-index', String(index));
          }
        });
      });
    }
  }
};
