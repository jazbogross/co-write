
import { DeltaStatic } from '@/utils/editor/quill-types';

export interface Suggestion {
  id: string;
  userId: string;
  username: string;
  deltaDiff: DeltaStatic;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
