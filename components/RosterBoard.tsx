import React, { forwardRef } from 'react';
import { StaffMember, RosterState } from '../types';
import { GridCell } from './GridCell';
import { SESSIONS, COLUMNS } from '../constants';

interface RosterBoardProps {
  roster: RosterState;
  staffList: StaffMember[];
  physioFTE: number;
  selectedStaffId: string | null;
  onColumnClick?: (colId: string) => void;
  onCellClick?: (cellId: string) => void;
  onDropOnCell?: (e: React.DragEvent<HTMLDivElement>, cellId: string) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string, source: 'pool' | 'grid', sourceCellId?: string) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, id: string, source: 'pool' | 'grid', sourceCellId?: string) => void;
  forceDesktop?: boolean;
}

export const RosterBoard = forwardRef<HTMLDivElement, RosterBoardProps>(({
  roster,
  staffList,
  physioFTE,
  selectedStaffId,
  onColumnClick,
  onCellClick,
  onDropOnCell,
  onDragStart,
  onTouchStart,
  forceDesktop = false
}, ref) => {

  // Helper function to switch classes based on mode
  // If forceDesktop is true, we ONLY use the desktop class.
  // If false, we use "mobileClass md:desktopClass"
  const cx = (mobile: string, desktop: string) => forceDesktop ? desktop : `${mobile} md:${desktop}`;

  return (
    <div 
      ref={ref}
      className={`flex-1 flex flex-col bg-white ${cx('border-[4px]', 'border-[12px]')} border-gray-300 rounded-lg shadow-xl ${cx('p-0.5', 'p-1')} w-full`}
    >
      <div className={`flex-1 flex flex-col ${cx('border-[2px]', 'border-[4px]')} border-gray-800 bg-white min-h-0`}>
        
        {/* Headers */}
        <div className={`grid ${cx('grid-cols-[2rem_repeat(5,1fr)]', 'grid-cols-[3rem_repeat(5,1fr)]')} ${cx('border-b-[2px]', 'border-b-[4px]')} border-gray-800 shrink-0`}>
           <div className={`bg-gray-200 ${cx('border-r-[2px]', 'border-r-[4px]')} border-gray-800`}></div>
           <div className={`col-span-2 text-center ${cx('text-xs sm:text-sm', 'text-xl')} font-bold uppercase ${cx('py-0.5 sm:py-1', 'py-2')} ${cx('border-r-[2px]', 'border-r-[4px]')} border-gray-800 bg-gray-100`}>Team 1</div>
           <div className={`col-span-2 text-center ${cx('text-xs sm:text-sm', 'text-xl')} font-bold uppercase ${cx('py-0.5 sm:py-1', 'py-2')} ${cx('border-r-[2px]', 'border-r-[4px]')} border-gray-800 bg-gray-100`}>Team 2</div>
           <div className="col-span-1 bg-gray-100"></div>
        </div>

        {/* Sub Headers */}
        <div className={`grid ${cx('grid-cols-[2rem_repeat(5,1fr)]', 'grid-cols-[3rem_repeat(5,1fr)]')} ${cx('border-b-[2px]', 'border-b-[4px]')} border-gray-800 shrink-0`}>
          <div className={`bg-gray-200 ${cx('border-r-[2px]', 'border-r-[4px]')} border-gray-800`}></div>
          {COLUMNS.map((col, idx) => (
            <div 
              key={col.id}
              onClick={() => onColumnClick && onColumnClick(col.id)}
              className={`
                text-center font-bold ${cx('text-[9px] sm:text-xs', 'text-lg')} ${cx('py-0.5 sm:py-1', 'py-2')} truncate px-0.5
                ${idx < COLUMNS.length - 1 ? cx('border-r-[2px]', 'border-r-[4px]') + ' border-gray-800' : ''}
                ${selectedStaffId ? 'bg-blue-50/50 text-blue-800 cursor-pointer' : 'bg-gray-50'}
              `}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows Container - Flex Grow to fill height */}
        <div className="flex-1 flex flex-col min-h-0">
          {SESSIONS.map((session, sIdx) => (
            <div 
              key={session} 
              className={`flex-1 grid ${cx('grid-cols-[2rem_repeat(5,1fr)]', 'grid-cols-[3rem_repeat(5,1fr)]')} min-h-0 ${sIdx < SESSIONS.length - 1 ? cx('border-b-[2px]', 'border-b-[4px]') + ' border-gray-800' : ''}`}
            >
              {/* Row Label */}
              <div className={`flex items-center justify-center font-bold ${cx('text-[9px] sm:text-xs', 'text-lg')} ${cx('border-r-[2px]', 'border-r-[4px]')} border-gray-800 bg-gray-50`}>
                {session}
              </div>
              
              {/* Cells */}
              {COLUMNS.map((col, cIdx) => {
                const cellId = `${session}-${col.id}`;
                const staffIds = roster[cellId] || [];
                const staffInCell = staffIds.map(id => staffList.find(s => s.id === id)).filter((s): s is StaffMember => !!s);
                return (
                  <div key={cellId} className={`min-h-0 overflow-hidden ${cIdx < COLUMNS.length - 1 ? cx('border-r-[2px]', 'border-r-[4px]') + ' border-gray-800' : ''}`}>
                    <GridCell
                      id={cellId}
                      staffInCell={staffInCell}
                      onDrop={onDropOnCell}
                      onDragStart={onDragStart ? (e: React.DragEvent<HTMLDivElement>, sid: string, from: string) => onDragStart(e, sid, 'grid', from) : undefined}
                      onTouchStart={onTouchStart ? (e: React.TouchEvent<HTMLDivElement>, sid: string, from: string) => onTouchStart(e, sid, 'grid', from) : undefined}
                      onClick={onCellClick ? () => onCellClick(cellId) : undefined}
                      isHighlighted={!!selectedStaffId}
                      forceDesktop={forceDesktop}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className={`mt-1 ${cx('', 'mt-2')} flex flex-col items-end px-2 pb-1 shrink-0`}>
         <div className={`${cx('text-sm', 'text-2xl')} font-bold text-gray-800 font-handwriting border-b border-gray-800 px-2`}>FTE = {physioFTE.toFixed(2)}</div>
         <div className={`${cx('text-[9px]', 'text-xs')} text-gray-400 italic`}>Generated: {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
});

RosterBoard.displayName = 'RosterBoard';