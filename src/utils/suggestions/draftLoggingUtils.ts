
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

export const logDraftLoading = (message: string, data?: any): void => {
  console.log(message, data);
};

export const logDeltaStructure = (delta: any, label = 'Delta'): void => {
  console.log(`---- ${label} Structure ----`);
  if (!delta) {
    console.log('Null or undefined delta');
    return;
  }
  
  console.log(`Type: ${typeof delta}`);
  if (isDeltaObject(delta)) {
    console.log(`Ops count: ${delta.ops.length}`);
    console.log('First 3 ops:', delta.ops.slice(0, 3));
  } else {
    console.log('Not a valid Delta object');
    console.log('Value:', delta);
  }
};
