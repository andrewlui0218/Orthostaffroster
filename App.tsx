import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Download, RotateCcw, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { INITIAL_STAFF, SESSIONS } from './constants';
import { StaffMember, RosterState, DragItem } from './types';
import { Magnet } from './components/Magnet';
import { RosterBoard } from './components/RosterBoard';
import { exportRosterAsImage } from './services/imageExporter';

export default function App() {
  const exportRef = useRef<HTMLDivElement>(null);
  
  // State
  const [roster, setRoster] = useState<RosterState>({});
  const [activeTab, setActiveTab] = useState<'PT' | 'Support'>('PT');
  const [staffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [isExporting, setIsExporting] = useState(false);
  
  // Selection state for "Stamp" mode
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const selectedStaffMember = useMemo(() => 
    staffList.find(s => s.id === selectedStaffId), 
  [selectedStaffId, staffList]);

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

  // --- Drag / Click Handlers ---

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
    const staff = staffList.find(s => s.id === item.id);
    if (!staff) return;

    const columnId = targetCellId.split('-').slice(1).join('-');
    const validation = isValidPlacement(staff, columnId);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setRoster(prev => {
      const newRoster = { ...prev };
      if (item.source === 'grid' && item.sourceCellId) {
        newRoster[item.sourceCellId] = (newRoster[item.sourceCellId] || []).filter(id => id !== item.id);
      }
      const currentCell = newRoster[targetCellId] || [];
      if (!currentCell.includes(item.id)) {
        newRoster[targetCellId] = [...currentCell, item.id];
      }
      return newRoster;
    });
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const item: DragItem = JSON.parse(data);

    if (item.source === 'grid' && item.sourceCellId) {
      setRoster(prev => {
        const newRoster = { ...prev };
        newRoster[item.sourceCellId] = (newRoster[item.sourceCellId] || []).filter(id => id !== item.id);
        return newRoster;
      });
    }
  };

  const handleStaffClick = (id: string) => {
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

  const handleExport = () => {
    if (window.innerWidth < 768) {
      if (!window.confirm("Generate and download the roster image?")) {
        return;
      }
    }

    setIsExporting(true);
    setSelectedStaffId(null);

    // Give UI a moment to show loading spinner
    setTimeout(async () => {
      try {
        if (exportRef.current) {
          await exportRosterAsImage(exportRef.current, `roster-${new Date().toISOString().split('T')[0]}.jpg`);
        }
      } catch (error) {
        console.error("Export failed", error);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const handleReset = () => {
    // Explicit window.confirm for better browser compatibility
    if (window.confirm('Are you sure you want to clear the entire roster?')) {
      setRoster({});
      setSelectedStaffId(null);
    }
  };

  const displayedStaff = getStaffByRole(activeTab);

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900 overflow-hidden relative">
      
      {/* Loading Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-lg font-semibold animate-pulse">Generating Roster Image...</p>
        </div>
      )}

      {/* --- HIDDEN EXPORT BOARD --- */}
      {/* This board is always rendered as 1280px wide Desktop layout, used solely for generating the JPG */}
      <div 
        style={{ position: 'absolute', top: -9999, left: -9999, width: '1280px', height: '800px', zIndex: -10 }}
      >
        <RosterBoard 
          ref={exportRef}
          roster={roster}
          staffList={staffList}
          physioFTE={physioFTE}
          selectedStaffId={null} // Don't show selection on export
          forceDesktop={true} // FORCE desktop styling
        />
      </div>

      {/* --- DESKTOP SIDEBAR --- */}
      <div 
        className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col shadow-xl z-20 shrink-0 h-full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnPool}
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

      {/* --- MAIN AREA: ROSTER BOARD --- */}
      <div className="flex-1 bg-gray-100 relative flex flex-col h-full overflow-hidden">
        
        {/* Floating Selection Indicator (Mobile & Desktop) */}
        {selectedStaffMember && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce-short">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Placing: {selectedStaffMember.name}</span>
            </div>
          </div>
        )}

        {/* Scrollable Board Container */}
        <div className="flex-1 overflow-hidden p-1 md:p-8 flex flex-col">
           {/* The Visible Interactive Whiteboard */}
           <RosterBoard 
             roster={roster}
             staffList={staffList}
             physioFTE={physioFTE}
             selectedStaffId={selectedStaffId}
             onColumnClick={handleColumnHeaderClick}
             onCellClick={handleGridCellClick}
             onDropOnCell={handleDropOnCell}
             onDragStart={handleDragStart}
             forceDesktop={false} // Use responsive sizing
           />
        </div>

        {/* --- MOBILE BOTTOM CONTROLS --- */}
        <div className="md:hidden bg-white border-t border-gray-300 flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-20 shrink-0">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50">
             <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="p-2 bg-red-100 text-red-600 rounded"
                >
                   <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="p-2 bg-blue-100 text-blue-600 rounded disabled:opacity-50"
                >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
             </div>
             
             {/* Role Toggles */}
             <div className="flex bg-gray-200 rounded p-0.5">
               {(['PT', 'Support'] as const).map(role => (
                 <button
                   key={role}
                   onClick={() => { setActiveTab(role); setSelectedStaffId(null); }}
                   className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                     activeTab === role ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
                   }`}
                 >
                   {role === 'PT' ? 'PT' : 'PCA'}
                 </button>
               ))}
             </div>
          </div>

          {/* Horizontal Staff List */}
          <div className="overflow-x-auto whitespace-nowrap p-2 bg-white min-h-[60px] flex items-center gap-2">
             {displayedStaff.map(staff => (
               <div key={staff.id} className="inline-block shrink-0">
                  <div 
                    onClick={() => handleStaffClick(staff.id)}
                    className={`
                      px-2 py-1.5 rounded border border-gray-300 shadow-sm cursor-pointer font-handwriting text-xs font-bold
                      transition-all transform active:scale-95
                      ${staff.defaultColor === 'yellow' ? 'bg-yellow-300' : 'bg-white'}
                      ${selectedStaffId === staff.id ? 'ring-2 ring-blue-500 scale-105 z-10' : ''}
                    `}
                  >
                    {staff.name}
                  </div>
               </div>
             ))}
             {/* Spacer for scroll end */}
             <div className="w-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}