import React from 'react';
import { StaffMember } from '../types';
import { Magnet } from './Magnet';

interface GridCellProps {
  id: string;
  staffInCell: StaffMember[];
  onClick?: () => void;
  isHighlighted?: boolean;
  forceDesktop?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ 
  id, 
  staffInCell, 
  onClick,
  isHighlighted,
  forceDesktop = false
}) => {

  // Helper for responsive padding
  const pClass = forceDesktop ? 'p-1' : 'p-0.5 md:p-1';

  return (
    <div
      onClick={onClick}
      data-cell-id={id}
      className={`
        h-full w-full 
        flex flex-col items-center justify-center ${pClass}
        transition-colors duration-200 overflow-hidden
        ${isHighlighted ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : 'bg-gray-100/50'}
        ${onClick ? 'cursor-pointer hover:bg-blue-50' : ''}
      `}
    >
      <div className="flex flex-wrap justify-center content-center w-full gap-0.5 pointer-events-none">
        {/* Pointer events none on wrapper, auto on children to ensure clicks pass through correctly or target magnets */}
        {staffInCell.map((staff) => (
          <div key={staff.id} className="pointer-events-auto">
            <Magnet
              staff={staff}
              // Drag functionality removed
              forceDesktop={forceDesktop}
            />
          </div>
        ))}
      </div>
    </div>
  );
};