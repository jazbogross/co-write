// CustomLineBlot.ts
import Quill from 'quill';
const Block = Quill.import('blots/block');

class LineBlot extends Block {
  static blotName = 'line';
  static tagName = 'p';

  // When a new line is created, attach the UUID if provided.
  static create(value: string) {
    const node = super.create();
    if (value) {
      node.setAttribute('data-line-uuid', value);
    }
    return node;
  }

  // When the Delta is generated, include our custom UUID attribute.
  static formats(node: HTMLElement) {
    return node.getAttribute('data-line-uuid') || undefined;
  }

  // Handle formatting changes – if the format is our custom "line-uuid", update the attribute.
  format(name: string, value: any) {
    if (name === 'line-uuid') {
      if (value) {
        this.domNode.setAttribute('data-line-uuid', value);
      } else {
        this.domNode.removeAttribute('data-line-uuid');
      }
    } else {
      super.format(name, value);
    }
  }
}

Quill.register(LineBlot);
