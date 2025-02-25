
import React from 'react';

interface LineNumbersProps {
  count: number;
}

export const LineNumbers: React.FC<LineNumbersProps> = ({ count }) => {
  const lineNumbers = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="pr-4 select-none text-right border-r border-gray-200 mr-4" style={{ minWidth: '30px' }}>
      {lineNumbers.map(num => (
        <div key={num} className="text-gray-400 text-xs line-number" style={{ height: '18px' }}>
          {num}
        </div>
      ))}
    </div>
  );
};
