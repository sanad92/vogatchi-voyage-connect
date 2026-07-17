import type { useBookingWorkspace } from '@/hooks/useBookingWorkspace';

export type Workspace = ReturnType<typeof useBookingWorkspace>;

export type TabKey =
  | 'overview'
  | 'itinerary'
  | 'financials'
  | 'documents'
  | 'whatsapp'
  | 'tasks'
  | 'timeline';
