import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Task, TimelineZoom, Phase } from '../types/project';
import {
  generateTimelineRange,
  dateToPixel,
  diffDays,
  TODAY_STR,
  determineTaskStatus,
  calculateCriticalPath,
  autoScheduleDependentTasks,
} from '../utils/dateUtils';
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Flag,
  Search,
  Filter,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Edit2,
  Trash2,
  Sparkles,
  Link2,
  GripVertical,
  ListOrdered,
  Plus,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { renumberProjectWBS } from '../utils/dateUtils';
import { PhaseEditModal } from './PhaseEditModal';

interface GanttChartProps {
  project: Project;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskToPhase: (phaseId: string) => void;
  onUpdateTaskDates: (taskId: string, startDate: string, endDate: string) => void;
  onReorderTasks: (newTasks: Task[]) => void;
  onUpdatePhases?: (newPhases: Phase[]) => void;
  onDeletePhase?: (phaseId: string, options?: { deleteTasks?: boolean; moveToPhaseId?: string }) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onEditTask,
  onDeleteTask,
  onAddTaskToPhase,
  onUpdateTaskDates,
  onReorderTasks,
  onUpdatePhases,
  onDeletePhase,
}) => {
  const [zoom, setZoom] = useState<TimelineZoom>('day');
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'milestones' | 'delayed' | 'critical'>('all');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('all');
  const [showDependencies, setShowDependencies] = useState(true);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Phase editing states
  const [editingPhaseModal, setEditingPhaseModal] = useState<Phase | null>(null);
  const [inlineEditingPhaseId, setInlineEditingPhaseId] = useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = useState('');

  // Drag and drop state for task reordering
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverTask = (e: React.DragEvent, targetTaskId: string, phaseId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTaskId === targetTaskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'above' : 'below';

    setDragOverTaskId(targetTaskId);
    setDropPosition(pos);
    setDragOverPhaseId(phaseId);
  };

  const handleDropOnTask = (e: React.DragEvent, targetTaskId: string, targetPhaseId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverPhaseId(null);
      return;
    }

    const currentTasks = [...project.tasks];
    const draggedIndex = currentTasks.findIndex((t) => t.id === draggedTaskId);
    if (draggedIndex === -1) return;

    const [draggedItem] = currentTasks.splice(draggedIndex, 1);
    const updatedItem: Task = {
      ...draggedItem,
      phaseId: targetPhaseId,
    };

    const targetIndex = currentTasks.findIndex((t) => t.id === targetTaskId);
    const insertIndex = dropPosition === 'above' ? targetIndex : targetIndex + 1;
    currentTasks.splice(insertIndex, 0, updatedItem);

    // Automatically renumber WBS codes in sequential order!
    const renumbered = renumberProjectWBS(project.phases, currentTasks);
    onReorderTasks(renumbered);

    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverPhaseId(null);
  };

  const handleDropOnPhaseHeader = (e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTaskId) return;

    const currentTasks = [...project.tasks];
    const draggedIndex = currentTasks.findIndex((t) => t.id === draggedTaskId);
    if (draggedIndex === -1) return;

    const [draggedItem] = currentTasks.splice(draggedIndex, 1);
    const updatedItem: Task = {
      ...draggedItem,
      phaseId: targetPhaseId,
    };

    // Place at the end of the target phase
    const lastIdxInPhase = currentTasks.map((t) => t.phaseId).lastIndexOf(targetPhaseId);
    if (lastIdxInPhase !== -1) {
      currentTasks.splice(lastIdxInPhase + 1, 0, updatedItem);
    } else {
      currentTasks.push(updatedItem);
    }

    const renumbered = renumberProjectWBS(project.phases, currentTasks);
    onReorderTasks(renumbered);

    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverPhaseId(null);
  };

  const handleAutoRenumberAll = () => {
    const renumbered = renumberProjectWBS(project.phases, project.tasks);
    onReorderTasks(renumbered);
  };

  // Check for any tasks where startDate <= predecessor endDate (FS conflict)
  const misalignedDependencies = useMemo(() => {
    let count = 0;
    const taskMap = new Map<string, Task>();
    project.tasks.forEach((t) => taskMap.set(t.id, t));

    project.tasks.forEach((t) => {
      if (t.predecessors && t.predecessors.length > 0) {
        for (const pId of t.predecessors) {
          const pred = taskMap.get(pId);
          if (pred && pred.endDate && t.startDate <= pred.endDate) {
            count++;
            break;
          }
        }
      }
    });
    return count;
  }, [project.tasks]);

  const handleAutoScheduleDependencies = () => {
    const { updatedTasks, adjustedCount } = autoScheduleDependentTasks(project.tasks);
    if (adjustedCount > 0) {
      onReorderTasks(updatedTasks);
    }
  };

  const handleSaveInlinePhase = (phaseId: string) => {
    if (!inlineEditingName.trim()) {
      setInlineEditingPhaseId(null);
      return;
    }
    const updated = project.phases.map((p) =>
      p.id === phaseId ? { ...p, name: inlineEditingName.trim() } : p
    );
    onUpdatePhases?.(updated);
    setInlineEditingPhaseId(null);
  };

  const handleSavePhaseFromModal = (updatedPhase: Phase) => {
    const updated = project.phases.map((p) =>
      p.id === updatedPhase.id ? updatedPhase : p
    );
    onUpdatePhases?.(updated);
    setEditingPhaseModal(null);
  };

  const handleDeletePhaseFromModal = (
    phaseId: string,
    options?: { deleteTasks?: boolean; moveToPhaseId?: string }
  ) => {
    if (onDeletePhase) {
      onDeletePhase(phaseId, options);
    } else {
      const updated = project.phases.filter((p) => p.id !== phaseId);
      onUpdatePhases?.(updated);
    }
    setEditingPhaseModal(null);
  };

  const handleAddNewPhase = () => {
    const nextOrder = project.phases.length + 1;
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: `${nextOrder}.0 新增分項工程`,
      code: `P${nextOrder}`,
      color: '#2563eb',
      order: nextOrder,
    };
    const updated = [...project.phases, newPhase];
    onUpdatePhases?.(updated);
    setEditingPhaseModal(newPhase);
  };

  // Critical path calculation
  const criticalPathSet = useMemo(() => calculateCriticalPath(project.tasks), [project.tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return project.tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchWbs = t.wbs.toLowerCase().includes(q);
        const matchAssignee = t.assignee?.toLowerCase().includes(q);
        if (!matchName && !matchWbs && !matchAssignee) return false;
      }
      if (selectedPhaseId !== 'all' && t.phaseId !== selectedPhaseId) {
        return false;
      }
      if (filterMode === 'milestones' && !t.isMilestone) {
        return false;
      }
      if (filterMode === 'delayed') {
        const status = determineTaskStatus(t, TODAY_STR);
        if (status !== 'delayed') return false;
      }
      if (filterMode === 'critical' && !criticalPathSet.has(t.id)) {
        return false;
      }
      return true;
    });
  }, [project.tasks, searchQuery, selectedPhaseId, filterMode, criticalPathSet]);

  // Generate timeline range
  const { minDate, maxDate, headers, totalDays, columnWidth } = useMemo(() => {
    return generateTimelineRange(project.tasks, zoom, 10, 20);
  }, [project.tasks, zoom]);

  // Compute total timeline width
  const timelinePixelWidth = useMemo(() => {
    return dateToPixel(maxDate, minDate, zoom, columnWidth) + 120;
  }, [maxDate, minDate, zoom, columnWidth]);

  // Position of TODAY line
  const todayPixel = useMemo(() => {
    return dateToPixel(TODAY_STR, minDate, zoom, columnWidth);
  }, [minDate, zoom, columnWidth]);

  // Scroll to TODAY on mount or zoom change
  const scrollToToday = () => {
    if (timelineContainerRef.current) {
      const containerW = timelineContainerRef.current.clientWidth;
      timelineContainerRef.current.scrollTo({
        left: Math.max(0, todayPixel - containerW / 3),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToToday, 250);
    return () => clearTimeout(timer);
  }, [zoom]);

  // Toggle Phase collapse
  const togglePhase = (phaseId: string) => {
    setCollapsedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const expandAll = () => setCollapsedPhases({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    project.phases.forEach((p) => (all[p.id] = true));
    setCollapsedPhases(all);
  };

  // Group tasks by phase
  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    project.phases.forEach((p) => map.set(p.id, []));
    filteredTasks.forEach((t) => {
      const list = map.get(t.phaseId) || [];
      list.push(t);
      map.set(t.phaseId, list);
    });
    return map;
  }, [project.phases, filteredTasks]);

  // Compute Task Row Heights and Y coordinates for SVG Dependency arrows
  // Every task row is 44px high. Phase header row is 38px high.
  const taskRowPositions = useMemo(() => {
    const positions = new Map<string, { y: number; height: number; left: number; width: number }>();
    let currentY = 0;

    project.phases.forEach((phase) => {
      const phaseTasks = groupedTasks.get(phase.id) || [];
      // Phase Header height: 38px
      currentY += 38;

      if (!collapsedPhases[phase.id]) {
        phaseTasks.forEach((t) => {
          const left = dateToPixel(t.startDate, minDate, zoom, columnWidth);
          const right = dateToPixel(t.endDate, minDate, zoom, columnWidth) + (zoom === 'day' ? columnWidth : columnWidth / 4);
          const width = Math.max(12, right - left);

          positions.set(t.id, {
            y: currentY + 22, // Vertical center of the 44px row
            height: 44,
            left,
            width,
          });

          currentY += 44;
        });
      }
    });

    return positions;
  }, [project.phases, groupedTasks, collapsedPhases, minDate, zoom, columnWidth]);

  // Calculate Dependency SVG Connectors
  const dependencyPaths = useMemo(() => {
    if (!showDependencies) return [];

    const paths: {
      id: string;
      d: string;
      isCritical: boolean;
      isHovered: boolean;
    }[] = [];

    project.tasks.forEach((targetTask) => {
      if (!targetTask.predecessors || targetTask.predecessors.length === 0) return;
      const targetPos = taskRowPositions.get(targetTask.id);
      if (!targetPos) return;

      targetTask.predecessors.forEach((predId) => {
        const sourcePos = taskRowPositions.get(predId);
        if (!sourcePos) return;

        const startX = sourcePos.left + sourcePos.width;
        const startY = sourcePos.y;
        const endX = targetPos.left;
        const endY = targetPos.y;

        const isCritical = criticalPathSet.has(predId) && criticalPathSet.has(targetTask.id);
        const isHovered = hoveredTaskId === predId || hoveredTaskId === targetTask.id;

        // Smooth S-curve or orthogonal bezier curve
        const dx = endX - startX;
        let d = '';

        if (dx >= 20) {
          // Standard forward arrow
          const midX = startX + dx * 0.5;
          d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        } else {
          // Backward / tight wrap around loop
          const offset = 14;
          const turnY = startY < endY ? startY + 18 : startY - 18;
          d = `M ${startX} ${startY} L ${startX + offset} ${startY} L ${startX + offset} ${turnY} L ${endX - offset} ${turnY} L ${endX - offset} ${endY} L ${endX} ${endY}`;
        }

        paths.push({
          id: `${predId}->${targetTask.id}`,
          d,
          isCritical,
          isHovered,
        });
      });
    });

    return paths;
  }, [showDependencies, project.tasks, taskRowPositions, criticalPathSet, hoveredTaskId]);

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* 1. Control Toolbar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Filter Tabs */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋工項、編號或工班..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48 transition-all"
            />
          </div>

          {/* Phase Filter Dropdown */}
          <select
            value={selectedPhaseId}
            onChange={(e) => setSelectedPhaseId(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">所有分項工程</option>
            {project.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Filter segment button */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              全部工項
            </button>
            <button
              onClick={() => setFilterMode('milestones')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'milestones' ? 'bg-white text-amber-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>管制節點</span>
            </button>
            <button
              onClick={() => setFilterMode('delayed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'delayed' ? 'bg-white text-red-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>落後預警</span>
            </button>
            <button
              onClick={() => setFilterMode('critical')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'critical' ? 'bg-white text-blue-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <span>關鍵路徑</span>
            </button>
          </div>
        </div>

        {/* Right: Zoom & Timeline actions */}
        <div className="flex items-center gap-2">
          {/* Auto Schedule Dependencies button */}
          <button
            onClick={handleAutoScheduleDependencies}
            title="依照 FS 緊前工作相依關係，自動將開工日期順延至緊前工項完工之次日 (並連動後續工項)"
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
              misalignedDependencies > 0
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-xs hover:bg-amber-100'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${misalignedDependencies > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
            <span>相依自動排程</span>
            {misalignedDependencies > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-3xs font-bold font-mono">
                {misalignedDependencies} 項可順延
              </span>
            )}
          </button>

          {/* Auto Renumber WBS button */}
          <button
            onClick={handleAutoRenumberAll}
            title="依照目前順序重新自動編排所有分項與工項之 WBS 編號 (如 1.1, 1.2, 2.1...)"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ListOrdered className="w-3 h-3 text-blue-600" />
            <span>自動重排 WBS</span>
          </button>

          {/* Toggle dependencies */}
          <button
            onClick={() => setShowDependencies((v) => !v)}
            title="顯示/隱藏工項相依關聯線"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              showDependencies
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>關聯線</span>
          </button>

          {/* Jump to Today */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
          >
            <Calendar className="w-3 h-3 text-red-500" />
            <span>今日</span>
          </button>

          {/* Expand/Collapse */}
          <div className="flex items-center text-xs text-slate-500 gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={expandAll}
              className="px-1.5 py-0.5 hover:text-slate-800 hover:bg-slate-100 rounded text-xs"
            >
              展開
            </button>
            <span>/</span>
            <button
              onClick={collapseAll}
              className="px-1.5 py-0.5 hover:text-slate-800 hover:bg-slate-100 rounded text-xs"
            >
              收合
            </button>
          </div>

          {/* Zoom scale segment */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border-l border-slate-200 pl-1">
            <button
              onClick={() => setZoom('day')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                zoom === 'day' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setZoom('week')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                zoom === 'week' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              週
            </button>
            <button
              onClick={() => setZoom('month')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                zoom === 'month' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              月
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Gantt Body: Left WBS Panel + Right Timeline Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: WBS Task List Grid (Fixed 440px width) */}
        <div
          ref={gridContainerRef}
          className="w-[440px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto select-none z-10 shadow-xs"
        >
          {/* Header row */}
          <div className="h-[60px] bg-slate-100/90 border-b border-slate-200 px-3 flex items-center justify-between text-xs font-semibold text-slate-700 sticky top-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-12 text-slate-400 pl-3">WBS</span>
              <span className="truncate">分項工程與工項名稱</span>
              {onUpdatePhases && (
                <button
                  type="button"
                  onClick={handleAddNewPhase}
                  title="新增分項工程"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-3xs font-medium rounded bg-white hover:bg-slate-200 text-blue-600 border border-slate-200 ml-1 shrink-0"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>分項</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 pr-1 text-slate-500 shrink-0">
              <span className="w-9 text-right">工期</span>
              <span className="w-12 text-right">進度</span>
              <span className="w-14 text-center">操作</span>
            </div>
          </div>

          {/* Rows */}
          <div className="flex-1 divide-y divide-slate-100">
            {project.phases.map((phase) => {
              const phaseTasks = groupedTasks.get(phase.id) || [];
              const isCollapsed = collapsedPhases[phase.id];

              // Calculate Phase level average progress
              const phaseProgress =
                phaseTasks.length > 0
                  ? Math.round(
                      phaseTasks.reduce((sum, t) => sum + t.progress, 0) / phaseTasks.length
                    )
                  : 0;

              return (
                <div key={phase.id} className="text-xs">
                  {/* Phase Group Header (38px height) */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverPhaseId(phase.id);
                    }}
                    onDrop={(e) => handleDropOnPhaseHeader(e, phase.id)}
                    className={`h-[38px] px-3 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between font-semibold text-slate-800 transition-colors border-l-4 group/phase ${
                      dragOverPhaseId === phase.id ? 'bg-blue-100/70 ring-1 ring-blue-400' : ''
                    }`}
                    style={{ borderLeftColor: phase.color }}
                  >
                    {/* Left: Collapse toggle + Name (inline edit or text) */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                      <button
                        type="button"
                        onClick={() => togglePhase(phase.id)}
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-500 shrink-0"
                        title={isCollapsed ? '點擊展開分項' : '點擊收合分項'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>

                      {inlineEditingPhaseId === phase.id ? (
                        <div
                          className="flex items-center gap-1 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={inlineEditingName}
                            onChange={(e) => setInlineEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePhase(phase.id);
                              if (e.key === 'Escape') setInlineEditingPhaseId(null);
                            }}
                            autoFocus
                            placeholder="分項名稱"
                            className="px-2 py-0.5 text-xs font-semibold bg-white border border-blue-500 rounded text-slate-900 w-full focus:outline-hidden ring-1 ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlinePhase(phase.id)}
                            title="儲存名稱"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineEditingPhaseId(null)}
                            title="取消"
                            className="p-1 text-slate-400 hover:bg-slate-200 rounded shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 min-w-0 flex-1"
                          onClick={() => togglePhase(phase.id)}
                        >
                          <span
                            className="truncate text-slate-800 hover:text-blue-700 transition-colors"
                            title="點擊展開/收合，或雙擊修改名稱"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setInlineEditingPhaseId(phase.id);
                              setInlineEditingName(phase.name);
                            }}
                          >
                            {phase.name}
                          </span>
                          <span className="text-2xs text-slate-400 font-normal shrink-0">
                            ({phaseTasks.length})
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhaseModal(phase);
                            }}
                            title="修改分項名稱與設定"
                            className="opacity-0 group-hover/phase:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded transition-opacity shrink-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Progress & Operation Buttons (Edit Phase + Add Task) */}
                    <div className="flex items-center gap-1.5 pr-1 text-slate-600 font-mono shrink-0">
                      <span className="w-12 text-right font-semibold text-slate-700 text-xs">
                        {phaseProgress}%
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPhaseModal(phase);
                        }}
                        title="編輯分項工程名稱與設定"
                        className="p-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded text-slate-500 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTaskToPhase(phase.id);
                        }}
                        title="在此分項工程新增工項"
                        className="p-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded text-slate-500 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Task Items in this phase (44px height per row) */}
                  {!isCollapsed &&
                    phaseTasks.map((task) => {
                      const status = determineTaskStatus(task, TODAY_STR);
                      const isCritical = criticalPathSet.has(task.id);
                      const isHovered = hoveredTaskId === task.id;
                      const isDragged = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOverTask(e, task.id, phase.id)}
                          onDrop={(e) => handleDropOnTask(e, task.id, phase.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverTaskId(null);
                            setDragOverPhaseId(null);
                          }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`h-[44px] px-2.5 flex items-center justify-between transition-colors border-b border-slate-100 relative group ${
                            isDragged
                              ? 'opacity-30 bg-slate-200'
                              : isHovered
                              ? 'bg-blue-50/70'
                              : isCritical
                              ? 'bg-red-50/30 hover:bg-slate-50'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Drag Target Insertion Indicators */}
                          {dragOverTaskId === task.id && dropPosition === 'above' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-30 pointer-events-none rounded-full" />
                          )}
                          {dragOverTaskId === task.id && dropPosition === 'below' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-30 pointer-events-none rounded-full" />
                          )}

                          {/* Left: Drag Grip Handle + WBS + Name */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                            <span title="按住滑鼠拖曳可調整前後順序，自動更新 WBS 編號" className="cursor-grab active:cursor-grabbing shrink-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                            </span>

                            <span className="w-8 font-mono text-slate-400 text-2xs shrink-0 font-semibold">
                              {task.wbs}
                            </span>
                            
                            {/* Milestone Marker badge or normal icon */}
                            {task.isMilestone ? (
                              <span
                                title={`管制節點: ${task.milestoneCriteria || '重要查驗點'}`}
                                className="w-4 h-4 rotate-45 bg-amber-500 text-white flex items-center justify-center rounded-xs shrink-0 shadow-2xs"
                              >
                                <span className="-rotate-45 text-2xs font-bold">◆</span>
                              </span>
                            ) : isCritical ? (
                              <span
                                title="關鍵路徑工項 (CPM Critical Path)"
                                className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                              />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                            )}

                            <span
                              className={`truncate font-medium text-slate-800 ${
                                task.isMilestone ? 'font-semibold text-slate-900' : ''
                              }`}
                              title={task.name}
                            >
                              {task.name}
                            </span>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center gap-4 pr-1 text-slate-500 font-mono text-2xs shrink-0">
                            <span className="w-10 text-right">
                              {task.duration}天
                            </span>

                            {/* Progress bar and percent */}
                            <div className="w-14 flex items-center gap-1.5 justify-end">
                              <span
                                className={`font-semibold ${
                                  task.progress === 100
                                    ? 'text-emerald-600'
                                    : status === 'delayed'
                                    ? 'text-red-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {task.progress}%
                              </span>
                            </div>

                            {/* Action icons */}
                            <div className="w-8 flex items-center justify-end gap-1 font-sans">
                              <button
                                onClick={() => onEditTask(task)}
                                title="編輯工項"
                                className="p-1 hover:text-blue-600 hover:bg-white rounded transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Timeline & Gantt Bars Area (Horizontally Scrollable) */}
        <div
          ref={timelineContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50/50 relative select-none"
        >
          <div
            className="relative min-h-full"
            style={{ width: `${timelinePixelWidth}px` }}
          >
            {/* 1. Dual-row Header (60px height sticky top) */}
            <div className="h-[60px] bg-white border-b border-slate-200 sticky top-0 z-20 flex flex-col shadow-2xs">
              {/* Top Row: Month / Grouping */}
              <div className="h-[28px] border-b border-slate-100 flex items-center text-2xs font-semibold text-slate-500 px-2 bg-slate-50/80">
                <div className="flex items-center gap-4">
                  <span>工程進度時程表 (基準開工日: {minDate} ~ 預定完工: {maxDate})</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-red-600 flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    今日基準日: {TODAY_STR}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Day/Week/Month ticks */}
              <div className="h-[32px] flex items-center bg-white">
                {headers.map((h) => (
                  <div
                    key={h.key}
                    style={{ width: `${columnWidth}px` }}
                    className={`h-full shrink-0 border-r border-slate-100 flex flex-col items-center justify-center text-center text-2xs ${
                      h.isToday
                        ? 'bg-red-50/80 font-bold text-red-600 border-r-red-300'
                        : h.isWeekend
                        ? 'bg-slate-100/50 text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="leading-tight font-mono">{h.label}</span>
                    <span className="text-3xs text-slate-400 leading-tight">
                      {h.subLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Background Grid Lines & Weekend bands */}
            <div className="absolute inset-0 top-[60px] flex pointer-events-none">
              {headers.map((h) => (
                <div
                  key={h.key}
                  style={{ width: `${columnWidth}px` }}
                  className={`h-full shrink-0 border-r border-slate-100/80 ${
                    h.isWeekend ? 'bg-slate-100/35' : ''
                  }`}
                />
              ))}
            </div>

            {/* 3. TODAY Vertical Marker Line */}
            {todayPixel >= 0 && (
              <div
                style={{ left: `${todayPixel + columnWidth / 2}px` }}
                className="absolute top-[28px] bottom-0 w-[2px] bg-red-500 z-15 pointer-events-none"
              >
                <div className="sticky top-[28px] -translate-x-1/2 bg-red-600 text-white text-3xs font-bold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                  今日
                </div>
              </div>
            )}

            {/* 4. SVG Dependencies Layer */}
            <svg
              className="absolute inset-0 top-[60px] pointer-events-none z-10"
              style={{ width: `${timelinePixelWidth}px`, height: '100%' }}
            >
              <defs>
                {/* Standard marker */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                {/* Critical path marker */}
                <marker
                  id="arrow-critical"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
                </marker>
                {/* Highlighted marker */}
                <marker
                  id="arrow-hover"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#2563eb" />
                </marker>
              </defs>

              {dependencyPaths.map((p) => (
                <path
                  key={p.id}
                  d={p.d}
                  fill="none"
                  stroke={
                    p.isHovered
                      ? '#2563eb'
                      : p.isCritical
                      ? '#ef4444'
                      : '#cbd5e1'
                  }
                  strokeWidth={p.isHovered ? 2.5 : p.isCritical ? 1.75 : 1.25}
                  strokeDasharray={p.isCritical ? '4,2' : undefined}
                  markerEnd={
                    p.isHovered
                      ? 'url(#arrow-hover)'
                      : p.isCritical
                      ? 'url(#arrow-critical)'
                      : 'url(#arrow-default)'
                  }
                  className="transition-all duration-150"
                />
              ))}
            </svg>

            {/* 5. Gantt Task & Phase Bars */}
            <div className="relative pt-0">
              {project.phases.map((phase) => {
                const phaseTasks = groupedTasks.get(phase.id) || [];
                const isCollapsed = collapsedPhases[phase.id];

                // Calculate Phase Span (Earliest task to latest task)
                let phaseMinTime = Infinity;
                let phaseMaxTime = -Infinity;
                phaseTasks.forEach((t) => {
                  const s = new Date(t.startDate).getTime();
                  const e = new Date(t.endDate).getTime();
                  if (s < phaseMinTime) phaseMinTime = s;
                  if (e > phaseMaxTime) phaseMaxTime = e;
                });

                const hasTasks = phaseTasks.length > 0;
                const phaseStartStr = hasTasks ? new Date(phaseMinTime).toISOString().split('T')[0] : minDate;
                const phaseEndStr = hasTasks ? new Date(phaseMaxTime).toISOString().split('T')[0] : minDate;

                const phaseLeft = hasTasks ? dateToPixel(phaseStartStr, minDate, zoom, columnWidth) : 0;
                const phaseRight = hasTasks ? dateToPixel(phaseEndStr, minDate, zoom, columnWidth) + columnWidth : 0;
                const phaseWidth = Math.max(10, phaseRight - phaseLeft);

                return (
                  <div key={phase.id}>
                    {/* Phase Summary Bar Row (38px height) */}
                    <div className="h-[38px] relative border-b border-slate-200/60 bg-slate-100/40">
                      {hasTasks && (
                        <div
                          style={{
                            left: `${phaseLeft}px`,
                            width: `${phaseWidth}px`,
                            top: '11px',
                            height: '16px',
                          }}
                          className="absolute rounded-xs overflow-hidden flex items-center bg-slate-200 border border-slate-300 shadow-2xs group"
                        >
                          <div
                            style={{
                              backgroundColor: phase.color,
                              width: `${
                                (phaseTasks.reduce((acc, t) => acc + t.progress, 0) /
                                  (phaseTasks.length * 100)) *
                                100
                              }%`,
                            }}
                            className="h-full opacity-35 transition-all duration-300"
                          />
                          <span className="absolute left-2 text-3xs font-bold text-slate-900 truncate pr-2 select-none">
                            {phase.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Task Rows (44px height per row) */}
                    {!isCollapsed &&
                      phaseTasks.map((task) => {
                        const status = determineTaskStatus(task, TODAY_STR);
                        const isCritical = criticalPathSet.has(task.id);
                        const isHovered = hoveredTaskId === task.id;

                        const left = dateToPixel(task.startDate, minDate, zoom, columnWidth);
                        const right =
                          dateToPixel(task.endDate, minDate, zoom, columnWidth) +
                          (zoom === 'day' ? columnWidth : columnWidth / 4);
                        const barWidth = Math.max(task.isMilestone ? 24 : 16, right - left);

                        // Color theme based on status with high contrast for dark text
                        let barBg = 'bg-slate-100 border-slate-300';
                        let fillBg = 'bg-blue-500/30 border-r-2 border-blue-600';
                        if (task.progress >= 100) {
                          barBg = 'bg-emerald-50 border-emerald-400';
                          fillBg = 'bg-emerald-500/35 border-r-2 border-emerald-600';
                        } else if (status === 'delayed') {
                          barBg = 'bg-red-50 border-red-400';
                          fillBg = 'bg-red-500/35 border-r-2 border-red-600';
                        } else if (isCritical) {
                          barBg = 'bg-amber-50 border-amber-400';
                          fillBg = 'bg-amber-500/35 border-r-2 border-amber-600';
                        } else {
                          barBg = 'bg-blue-50/60 border-blue-300';
                          fillBg = 'bg-blue-500/30 border-r-2 border-blue-600';
                        }

                        return (
                          <div
                            key={task.id}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                            className={`h-[44px] relative border-b border-slate-100 transition-colors ${
                              isHovered ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            {/* Milestone Diamond or Standard Task Bar */}
                            {task.isMilestone ? (
                              <div
                                style={{
                                  left: `${left + columnWidth / 2 - 12}px`,
                                  top: '10px',
                                }}
                                onClick={() => onEditTask(task)}
                                className="absolute cursor-pointer z-12 flex items-center group"
                              >
                                {/* Rotated Diamond */}
                                <div
                                  className={`w-6 h-6 rotate-45 flex items-center justify-center transition-transform hover:scale-110 shadow-sm border-2 ${
                                    task.progress >= 100
                                      ? 'bg-emerald-500 border-white text-white'
                                      : status === 'delayed'
                                      ? 'bg-red-500 border-white text-white animate-pulse'
                                      : 'bg-amber-500 border-white text-white'
                                  }`}
                                >
                                  <span className="-rotate-45 text-2xs font-bold">
                                    ★
                                  </span>
                                </div>

                                {/* Text Label next to Diamond */}
                                <div className="ml-3 pl-1 text-2xs font-bold text-slate-900 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs group-hover:border-blue-500">
                                  <span>{task.name}</span>
                                  <span className="ml-2 font-mono text-3xs text-slate-600">
                                    ({task.startDate})
                                  </span>
                                  {task.milestoneCriteria && (
                                    <span className="ml-1.5 text-3xs text-amber-700">
                                      · {task.milestoneCriteria}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Standard Gantt Bar */
                              <div
                                style={{
                                  left: `${left}px`,
                                  width: `${barWidth}px`,
                                  top: '8px',
                                  height: '28px',
                                }}
                                onClick={() => onEditTask(task)}
                                className={`absolute rounded-md cursor-pointer z-12 shadow-2xs border transition-all group ${
                                  isCritical
                                    ? 'border-red-500 ring-1 ring-red-400/50'
                                    : 'border-slate-300'
                                } ${barBg}`}
                              >
                                {/* Actual Progress Fill */}
                                <div
                                  style={{ width: `${task.progress}%` }}
                                  className={`h-full ${fillBg} rounded-l-md transition-all duration-300`}
                                />

                                {/* Bar Inner Label - Changed from white to high-contrast dark text */}
                                {barWidth >= 65 ? (
                                  <div className="absolute inset-0 px-2 flex items-center justify-between pointer-events-none text-2xs select-none">
                                    <span className="font-bold truncate text-slate-900 pr-1 tracking-tight">
                                      {task.name}
                                    </span>
                                    <span className="font-mono text-3xs font-extrabold text-slate-900 shrink-0">
                                      {task.progress}%
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-3xs font-mono font-extrabold text-slate-900 select-none">
                                      {task.progress}%
                                    </div>
                                    <div
                                      style={{ left: `${barWidth + 6}px` }}
                                      className="absolute top-1 text-2xs font-bold text-slate-900 whitespace-nowrap pointer-events-none select-none bg-white/80 px-1 rounded"
                                    >
                                      {task.name}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Hover info tooltip */}
                            {isHovered && (
                              <div
                                style={{
                                  left: `${left + barWidth + 12}px`,
                                  top: '4px',
                                }}
                                className="absolute z-30 bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs pointer-events-none whitespace-nowrap"
                              >
                                <div className="font-bold flex items-center gap-1.5 mb-1">
                                  <span>{task.wbs}</span>
                                  <span>{task.name}</span>
                                </div>
                                <div className="text-3xs text-slate-300 space-y-0.5 font-mono">
                                  <div>
                                    工期: {task.startDate} ~ {task.endDate} ({task.duration}天)
                                  </div>
                                  <div>
                                    實際進度: {task.progress}% · 權重: {task.weight}%
                                  </div>
                                  {task.assignee && (
                                    <div>負責工班: {task.assignee}</div>
                                  )}
                                  {task.location && (
                                    <div>施工工區: {task.location}</div>
                                  )}
                                  {task.milestoneCriteria && (
                                    <div className="text-amber-300 font-semibold">
                                      管制查驗標準: {task.milestoneCriteria}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Status Legend */}
      <div className="no-print p-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="font-semibold text-slate-700">圖例說明:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded-xs" />
            <span>已完成 (100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-600 rounded-xs" />
            <span>施工進行中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-xs" />
            <span>進度落後預警</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-amber-500 rounded-2xs inline-block" />
            <span className="ml-1 font-semibold text-amber-700">管制節點 / 里程碑</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-red-500 border-b border-red-500" />
            <span className="font-semibold text-red-600">關鍵路徑 (CPM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 bg-red-500" />
            <span>今日進度線</span>
          </div>
        </div>

        <div className="text-2xs text-slate-400">
          * 點擊任意工項可直接編輯詳細資訊、相依關係與管制驗證標準
        </div>
      </div>

      {/* 4. Phase Edit Modal */}
      <PhaseEditModal
        isOpen={!!editingPhaseModal}
        onClose={() => setEditingPhaseModal(null)}
        phase={editingPhaseModal}
        project={project}
        onSavePhase={handleSavePhaseFromModal}
        onDeletePhase={handleDeletePhaseFromModal}
      />
    </div>
  );
};
