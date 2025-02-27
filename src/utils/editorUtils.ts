
export const extractLineContents = (lines: any[]): string[] => {
  return lines.map(line => line.domNode ? line.domNode.textContent || '' : '');
};

export const reconstructContent = (lineData: Array<{ content: string }>): string => {
  return lineData.map(line => line.content).join('\n');
};
