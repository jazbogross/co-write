import React, { useEffect, useState } from 'react';

interface LineNumbersProps {
  count: number;
}

export const LineNumbers: React.FC<LineNumbersProps> = ({ count }) => {
  const [offsets, setOffsets] = useState<number[]>([]);

  useEffect(() => {
    const editor = document.querySelector('.ql-editor');
    if (!editor) return;

    const updateOffsets = () => {
      // Select all block-level <p> elements (each deliberate line break)
      const paragraphs = editor.querySelectorAll('p');
      const newOffsets = Array.from(paragraphs).map(p => p.offsetTop);
      setOffsets(newOffsets);
    };

    // Update offsets immediately
    updateOffsets();

    // Set up a MutationObserver to catch content changes (including text changes)
    const observer = new MutationObserver(() => {
      updateOffsets();
    });
    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also update on window resize (as soft wrapping may change)
    window.addEventListener('resize', updateOffsets);

    // Clean up the observer and listener on unmount
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffsets);
    };
  }, [count]);

  return (
    <div
      className="pr-4 select-none mr-5 bg-background h-full text-right border-gray-200 relative"
      style={{ minWidth: '30px', left: '-90px' }}
    >
      {offsets.map((offset, i) => (
        <div
          key={i}
          className="text-gray-400 text-s text-right line-number absolute"
          style={{ top: offset, height: '18px', lineHeight: '18px' }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
};
