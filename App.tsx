import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Download, RotateCcw, Users, CheckCircle2, Loader2, X, Share2, Save } from 'lucide-react';
import { INITIAL_STAFF, SESSIONS } from './constants';
import { StaffMember, RosterState, DragItem } from './types';
import { Magnet } from './components/Magnet';
import { RosterBoard } from './components/RosterBoard';
import { generateRosterBlob, downloadBlob } from './services/imageExporter';

// --- TOUCH TYPES ---
interface TouchDragItem {
  id: string;
  x: number;
  y: number;
  source: 'pool' | 'grid';
  sourceCellId?: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export default function App() {
  const exportRef = useRef<HTMLDivElement>(null);
  
  // State
  const [roster, setRoster] = useState<RosterState>({});
  const [activeTab, setActiveTab] = useState<'PT' | 'Support'>('PT');
  const [staffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [isExporting, setIsExporting] = useState(false);
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  
  // Selection state for "Stamp" mode
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const selectedStaffMember = useMemo(() => 
    staffList.find(s => s.id === selectedStaffId), 
  [selectedStaffId, staffList]);

  // Touch Drag State
  const [touchDragItem, setTouchDragItem] = useState<TouchDragItem | null>(null);

  // Helper to get staff by role (allows multiple assignments)
  const getStaffByRole = useCallback((role: 'PT' | 'Support') => {
    return staffList.filter(s => s.role === role);
  }, [staffList]);

  // Calculate FTE for Physio staff
  // 1 assignment = 0.25 FTE
  const physioFTE = useMemo(() => {
    let count = 0;
    Object.values(roster).forEach(staffIds => {
      staffIds.forEach(id => {
        const staff = staffList.find(s => s.id === id);
        // Only count PT assignments towards Physio Manpower FTE
        if (staff?.role === 'PT') {
          count++;
        }
      });
    });
    return count * 0.25;
  }, [roster, staffList]);

  // Validation Logic
  const isValidPlacement = (staff: StaffMember, columnId: string): { valid: boolean; error?: string } => {
    const isPcaColumn = columnId === 'PCA' || columnId.endsWith('PCA');
    
    if (staff.role === 'PT' && isPcaColumn) {
      return { valid: false, error: "Physiotherapists (PT) cannot be placed in the PCA column." };
    }
    if (staff.role === 'Support' && !isPcaColumn) {
      return { valid: false, error: "Support staff (PCA) cannot be placed in PT columns." };
    }
    return { valid: true };
  };

  // --- Common Roster Update Logic ---

  const moveStaff = (staffId: string, targetCellId: string, sourceCellId?: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    const columnId = targetCellId.split('-').slice(1).join('-');
    const validation = isValidPlacement(staff, columnId);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setRoster(prev => {
      const newRoster = { ...prev };
      // Remove from source if applicable
      if (sourceCellId) {
        newRoster[sourceCellId] = (newRoster[sourceCellId] || []).filter(id => id !== staffId);
      }
      // Add to target
      const currentCell = newRoster[targetCellId] || [];
      if (!currentCell.includes(staffId)) {
        newRoster[targetCellId] = [...currentCell, staffId];
      }
      return newRoster;
    });
  };

  const removeStaffFromCell = (staffId: string, cellId: string) => {
    setRoster(prev => {
      const newRoster = { ...prev };
      newRoster[cellId] = (newRoster[cellId] || []).filter(id => id !== staffId);
      return newRoster;
    });
  };

  // --- Mouse Drag Handlers (Desktop) ---

  const handleDragStart = (e: React.DragEvent, id: string, source: 'pool' | 'grid', sourceCellId?: string) => {
    const item: DragItem = { id, source, sourceCellId };
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    if (selectedStaffId) setSelectedStaffId(null);
  };

  const handleDropOnCell = (e: React.DragEvent, targetCellId: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const item: DragItem = JSON.parse(data);
    moveStaff(item.id, targetCellId, item.source === 'grid' ? item.sourceCellId : undefined);
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const item: DragItem = JSON.parse(data);

    if (item.source === 'grid' && item.sourceCellId) {
      removeStaffFromCell(item.id, item.sourceCellId);
    }
  };

  // --- Touch Drag Handlers (Mobile) ---

  const handleTouchStart = (e: React.TouchEvent, id: string, source: 'pool' | 'grid', sourceCellId?: string) => {
    // We allow the browser to handle the start, but we capture metrics.
    // The Magnet component has touch-action: none, which prevents scrolling.
    
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Calculate offset so the item doesn't jump to center of finger
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    setTouchDragItem({
      id,
      x: touch.clientX,
      y: touch.clientY,
      source,
      sourceCellId,
      offsetX,
      offsetY,
      width: rect.width,
      height: rect.height,
    });
    
    if (selectedStaffId) setSelectedStaffId(null);
  };

  // Global Touch Move/End Listeners
  useEffect(() => {
    if (!touchDragItem) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault(); // Stop scrolling while dragging
      const touch = e.touches[0];
      setTouchDragItem(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
       const touch = e.changedTouches[0];
       
       // Find drop target
       const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
       
       // Check for Grid Cell
       const cellElement = elements.find(el => el.hasAttribute('data-cell-id'));
       
       // Check for Pool Area (Sidebar on desktop, or anywhere outside board)
       const poolElement = elements.find(el => el.hasAttribute('data-pool-area'));

       if (cellElement) {
          const targetCellId = cellElement.getAttribute('data-cell-id');
          if (targetCellId) {
             moveStaff(touchDragItem.id, targetCellId, touchDragItem.source === 'grid' ? touchDragItem.sourceCellId : undefined);
          }
       } else if (poolElement || (touchDragItem.source === 'grid' && !cellElement)) {
          // Dropped back to pool (or outside grid)
          if (touchDragItem.source === 'grid' && touchDragItem.sourceCellId) {
             removeStaffFromCell(touchDragItem.id, touchDragItem.sourceCellId);
          }
       }

       setTouchDragItem(null);
    };

    // Add passive: false to allow preventDefault (stopping scroll)
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', () => setTouchDragItem(null));

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', () => setTouchDragItem(null));
    };
  }, [touchDragItem]);


  // --- Click Handlers ---

  const handleStaffClick = (id: string) => {
    // If dragging recently occurred (touch), ignore the click? 
    // Usually click fires after touchend. Our drag system clears state on touchend.
    setSelectedStaffId(prev => prev === id ? null : id);
  };

  const handleGridCellClick = (cellId: string) => {
    if (!selectedStaffId) return;
    const staff = staffList.find(s => s.id === selectedStaffId);
    if (!staff) return;

    const columnId = cellId.split('-').slice(1).join('-');
    const validation = isValidPlacement(staff, columnId);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setRoster(prev => {
      const currentCell = prev[cellId] || [];
      if (currentCell.includes(selectedStaffId)) {
        return {
          ...prev,
          [cellId]: currentCell.filter(id => id !== selectedStaffId)
        };
      } else {
        return {
          ...prev,
          [cellId]: [...currentCell, selectedStaffId]
        };
      }
    });
  };

  const handleColumnHeaderClick = (colId: string) => {
    if (!selectedStaffId) return;

    const staff = staffList.find(s => s.id === selectedStaffId);
    if (!staff) return;

    const validation = isValidPlacement(staff, colId);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setRoster(prev => {
      const newRoster = { ...prev };
      SESSIONS.forEach(session => {
        const cellId = `${session}-${colId}`;
        const currentCell = newRoster[cellId] || [];
        if (!currentCell.includes(selectedStaffId)) {
          newRoster[cellId] = [...currentCell, selectedStaffId];
        }
      });
      return newRoster;
    });
  };

  // --- Export Logic ---

  const handleExport = async () => {
    setIsExporting(true);
    setSelectedStaffId(null);
    setExportBlob(null);

    // Short delay to let UI update
    setTimeout(async () => {
      if (exportRef.current) {
        const blob = await generateRosterBlob(exportRef.current);
        if (blob) {
            const fileName = `roster-${new Date().toISOString().split('T')[0]}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            
            // Try Native Share First (Mobile "Save to Photos" workflow)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Daily Staff Roster',
                        text: 'Here is today\'s roster.'
                    });
                    setIsExporting(false); // Done if shared successfully
                    return; 
                } catch (err) {
                    console.log('Share cancelled or failed, falling back to modal', err);
                }
            }

            // Fallback: Show Modal
            setExportBlob(blob);
        }
      }
      setIsExporting(false);
    }, 100);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear the entire roster?')) {
      setRoster({});
      setSelectedStaffId(null);
    }
  };

  const displayedStaff = getStaffByRole(activeTab);

  return (
    // Use 100dvh (Dynamic Viewport Height) to ensure full mobile screen usage without address bar issues
    <div className="h-[100dvh] w-full bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900 overflow-hidden relative">
      
      {/* Loading Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-lg font-semibold animate-pulse">Generating High-Res Image...</p>
        </div>
      )}

      {/* Export Success Modal (Fallback) */}
      {exportBlob && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg">Roster Image Ready</h3>
                    <button onClick={() => setExportBlob(null)} className="p-1 hover:bg-gray-200 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
                    <img 
                        src={URL.createObjectURL(exportBlob)} 
                        alt="Roster Export" 
                        className="max-w-full shadow-lg border" 
                    />
                </div>
                <div className="p-4 border-t bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-4">
                        <span className="md:hidden">Long-press the image to <b>Save to Photos</b></span>
                        <span className="hidden md:inline">Right-click image to Save As...</span>
                    </p>
                    <button 
                        onClick={() => downloadBlob(exportBlob, `roster-${new Date().toISOString().split('T')[0]}.jpg`)}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-transform"
                    >
                        <Save className="w-5 h-5" /> Download Image
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Touch Drag Ghost Item */}
      {touchDragItem && (
        <div 
          className="fixed z-[100] pointer-events-none opacity-90"
          style={{
             left: touchDragItem.x,
             top: touchDragItem.y,
             width: touchDragItem.width,
             height: touchDragItem.height,
             transform: `translate(-${touchDragItem.offsetX}px, -${touchDragItem.offsetY}px)`
          }}
        >
           <div className={`
              w-full h-full
              flex items-center justify-center
              bg-yellow-300 border border-gray-400 shadow-2xl 
              text-sm font-handwriting font-bold uppercase rounded
              scale-110 ring-2 ring-blue-500
              whitespace-nowrap overflow-hidden
           `}>
             {staffList.find(s => s.id === touchDragItem.id)?.name}
           </div>
        </div>
      )}


      {/* --- HIDDEN EXPORT BOARD (FIXED DESKTOP WIDTH) --- */}
      <div 
        style={{ position: 'absolute', top: -9999, left: -9999, width: '1280px', height: '800px', zIndex: -10 }}
      >
        <RosterBoard 
          ref={exportRef}
          roster={roster}
          staffList={staffList}
          physioFTE={physioFTE}
          selectedStaffId={null} 
          forceDesktop={true} // Triggers desktop layout styles
        />
      </div>

      {/* --- DESKTOP SIDEBAR (Hidden on mobile) --- */}
      <div 
        className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col shadow-xl z-20 shrink-0 h-full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnPool}
        data-pool-area="true"
      >
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-1">
            <Users className="w-6 h-6" /> Staff Pool
            <span className="text-sm font-normal text-gray-400 ml-auto bg-gray-100 px-2 py-0.5 rounded-full">
              {displayedStaff.length}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mb-3">Drag or click to assign.</p>
          
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['PT', 'Support'] as const).map(role => (
              <button
                key={role}
                onClick={() => { setActiveTab(role); setSelectedStaffId(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === role ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role === 'PT' ? 'Physio' : 'Support'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 grid grid-cols-2 gap-2 content-start">
          {displayedStaff.map(staff => (
            <Magnet 
              key={staff.id}
              staff={staff} 
              onDragStart={(e, id) => handleDragStart(e, id, 'pool')} 
              onTouchStart={(e, id) => handleTouchStart(e, id, 'pool')}
              onClick={() => handleStaffClick(staff.id)}
              isSelected={selectedStaffId === staff.id}
            />
          ))}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex flex-col gap-2">
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handleReset} 
              className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button 
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN AREA --- */}
      <div className="flex-1 bg-gray-100 relative flex flex-col h-full overflow-hidden">
        
        {/* Floating Stamp Indicator */}
        {selectedStaffMember && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce-short">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Placing: {selectedStaffMember.name}</span>
            </div>
          </div>
        )}

        {/* Board Container - Takes up remaining height */}
        <div className="flex-1 overflow-hidden p-1 md:p-8 flex flex-col" data-pool-area="true">
           <RosterBoard 
             roster={roster}
             staffList={staffList}
             physioFTE={physioFTE}
             selectedStaffId={selectedStaffId}
             onColumnClick={handleColumnHeaderClick}
             onCellClick={handleGridCellClick}
             onDropOnCell={handleDropOnCell}
             onDragStart={handleDragStart}
             onTouchStart={handleTouchStart}
             forceDesktop={false}
           />
        </div>

        {/* --- MOBILE CONTROLS / STAFF POOL --- */}
        {/* Fixed height (30dvh) bottom sheet to ensure staff pool is visible without body scroll */}
        <div 
          className="md:hidden bg-white border-t border-gray-300 flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-20 shrink-0 h-[30dvh]" 
          data-pool-area="true"
        >
          {/* Header Row: Actions & Toggles */}
          <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50 shrink-0">
             <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="p-1.5 bg-red-100 text-red-600 rounded flex items-center justify-center"
                >
                   <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="p-1.5 bg-blue-100 text-blue-600 rounded flex items-center justify-center disabled:opacity-50"
                >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                </button>
             </div>
             
             {/* Role Toggles */}
             <div className="flex bg-gray-200 rounded p-0.5">
               {(['PT', 'Support'] as const).map(role => (
                 <button
                   key={role}
                   onClick={() => { setActiveTab(role); setSelectedStaffId(null); }}
                   className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                     activeTab === role ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
                   }`}
                 >
                   {role === 'PT' ? 'PT' : 'PCA'}
                 </button>
               ))}
             </div>
          </div>

          {/* Scrollable Staff Grid */}
          <div className="flex-1 overflow-y-auto p-2 bg-white grid grid-cols-3 xs:grid-cols-4 gap-2 content-start">
             {displayedStaff.map(staff => (
               <div key={staff.id} className="touch-none select-none">
                 <Magnet
                    staff={staff}
                    onTouchStart={(e, id) => handleTouchStart(e, id, 'pool')}
                    onClick={() => handleStaffClick(staff.id)}
                    isSelected={selectedStaffId === staff.id}
                 />
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}