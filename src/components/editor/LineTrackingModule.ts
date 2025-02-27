
import { Quill } from 'react-quill';

export const LineTrackingModule = {
  addLineIds: {
    setup: function(quill: typeof Quill) {
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
