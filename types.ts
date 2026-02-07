export type StaffRole = 'PT' | 'Support';
export type MagnetColor = 'white' | 'yellow';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  defaultColor: MagnetColor;
}

// The grid coordinates
// 1st, 2nd, 3rd, 4th
export type Session = '1st' | '2nd' | '3rd' | '4th';

// The columns
// Team 1 PTI, Team 1 PTII, Team 2 PTI, Team 2 PTII, PCA
export type ColumnId = 'T1_PTI' | 'T1_PTII' | 'T2_PTI' | 'T2_PTII' | 'PCA';

export interface RosterState {
  [cellId: string]: string[]; // cellId -> array of staff IDs
}

// A helper type for the drag item
export interface DragItem {
  id: string;
  source: 'pool' | 'grid';
  sourceCellId?: string;
}
