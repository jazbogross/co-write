
import React, { useEffect, useState, useRef } from 'react';

interface LineNumbersProps {
  count: number;
}

export const LineNumbers: React.FC<LineNumbersProps> = ({ count }) => {
  const [offsets, setOffsets] = useState<number[]>([]);
  const previousCount = useRef<number>(0);

  useEffect(() => {
    if (previousCount.current !== count) {
      console.log(`🔢 LineNumbers: count changed from ${previousCount.current} to ${count}`);
      previousCount.current = count;
    }
    
    const editor = document.querySelector('.ql-editor');
    if (!editor) {
      console.log('🔢 LineNumbers: No .ql-editor found in DOM');
      return;
    }

    const updateOffsets = () => {
      // Select all block-level <p> elements (each deliberate line break)
      const paragraphs = editor.querySelectorAll('p');
      console.log(`🔢 LineNumbers: Found ${paragraphs.length} paragraphs in DOM`);
      
      if (paragraphs.length !== count) {
        console.log(`🔢 LineNumbers: ⚠️ MISMATCH - DOM has ${paragraphs.length} paragraphs but count prop is ${count}`);
      }
      
      const newOffsets = Array.from(paragraphs).map(p => {
        // Log data-line-uuid for debugging
        const uuid = p.getAttribute('data-line-uuid');
        if (!uuid) {
          console.log('🔢 LineNumbers: ⚠️ Found paragraph without UUID', p.textContent?.substring(0, 30));
        }
        return p.offsetTop;
      });
      
      setOffsets(newOffsets);
      console.log(`🔢 LineNumbers: Updated ${newOffsets.length} line offsets`);
    };

    // Update offsets immediately
    updateOffsets();

    // Set up a MutationObserver to catch content changes (including text changes)
    const observer = new MutationObserver(() => {
      console.log('🔢 LineNumbers: DOM mutation detected, updating offsets');
      updateOffsets();
    });
    
    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also update on window resize (as soft wrapping may change)
    const handleResize = () => {
      console.log('🔢 LineNumbers: Window resize detected, updating offsets');
      updateOffsets();
    };
    
    window.addEventListener('resize', handleResize);

    // Clean up the observer and listener on unmount
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      console.log('🔢 LineNumbers: Cleanup - observer disconnected, event listener removed');
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
          data-line-index={i}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
};
