import React, { useState, useRef } from 'react';
import { StaffMember } from '../types';
import { Magnet } from './Magnet';

interface GridCellProps {
  id: string;
  staffInCell: StaffMember[];
  onDrop?: (e: React.DragEvent, cellId: string) => void;
  onDragStart?: (e: React.DragEvent, staffId: string, fromCellId: string) => void;
  onClick?: () => void;
  isHighlighted?: boolean;
  forceDesktop?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ 
  id, 
  staffInCell, 
  onDrop, 
  onDragStart,
  onClick,
  isHighlighted,
  forceDesktop = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop) return;
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop) return;
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop) return;
    dragCounter.current = 0;
    setIsDragOver(false);
    onDrop(e, id);
  };

  const showHighlight = isDragOver || isHighlighted;

  // Helper for responsive padding
  const pClass = forceDesktop ? 'p-1' : 'p-0.5 md:p-1';

  return (
    <div
      onClick={onClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`
        h-full w-full 
        flex flex-col items-center justify-center ${pClass}
        transition-colors duration-200 overflow-hidden
        ${showHighlight ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : 'bg-gray-100/50'}
        ${onClick ? 'cursor-pointer hover:bg-blue-50' : ''}
      `}
    >
      <div className="flex flex-wrap justify-center content-center w-full gap-0.5">
        {staffInCell.map((staff) => (
          <Magnet
            key={staff.id}
            staff={staff}
            onDragStart={onDragStart ? (e) => onDragStart(e, staff.id, id) : undefined}
            forceDesktop={forceDesktop}
          />
        ))}
      </div>
    </div>
  );
};