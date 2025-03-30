
import { DeltaStatic } from 'quill';

export interface Suggestion {
  id: string;
  userId: string;
  username: string;
  deltaDiff: DeltaStatic;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface GroupedSuggestion {
  userId: string;
  username: string;
  suggestions: Suggestion[];
}
