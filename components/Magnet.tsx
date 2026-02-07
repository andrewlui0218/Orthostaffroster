import React from 'react';
import { StaffMember } from '../types';

interface MagnetProps {
  staff: StaffMember;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, staffId: string) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, staffId: string) => void;
  isDragging?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  forceDesktop?: boolean;
}

export const Magnet: React.FC<MagnetProps> = ({ 
  staff, 
  onDragStart, 
  onTouchStart,
  isDragging,
  onClick,
  isSelected,
  forceDesktop = false
}) => {
  const bgColor = staff.defaultColor === 'yellow' ? 'bg-yellow-300' : 'bg-white';
  
  // Helper for responsive classes
  const cx = (mobile: string, desktop: string) => forceDesktop ? desktop : `${mobile} md:${desktop}`;

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, staff.id)}
      onTouchStart={(e) => onTouchStart && onTouchStart(e, staff.id)}
      onClick={onClick}
      className={`
        relative 
        ${cx('px-1 py-0.5 mb-0.5', 'px-3 py-1 mb-1')}
        ${bgColor} 
        border border-gray-400 shadow-sm
        ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}
        select-none touch-none
        transform transition-all duration-200
        text-center font-semibold text-gray-800 
        ${cx('text-[9px] sm:text-[10px]', 'text-sm')} font-handwriting
        uppercase tracking-wide
        whitespace-nowrap overflow-hidden text-ellipsis max-w-full
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isSelected ? cx('ring-2 ring-offset-1 scale-105', 'ring-4 ring-offset-1 scale-110') + ' ring-blue-500 z-10' : 'hover:scale-105'}
      `}
      style={{
        transform: isSelected ? 'rotate(0deg)' : `rotate(${staff.name.length % 2 === 0 ? '1deg' : '-1deg'})`,
        // Prevent default browser touch actions (scrolling) when touching the magnet
        touchAction: 'none'
      }}
    >
      {!isSelected && (
        <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 ${cx('w-4 h-2', 'w-8 h-3')} bg-white/30 rotate-1`}></div>
      )}
      {staff.name}
    </div>
  );
};