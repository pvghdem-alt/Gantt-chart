import React, { useState } from 'react';
import { Project, Task, Phase } from '../types/project';
import { TODAY_STR, determineTaskStatus, diffDays, renumberProjectWBS, autoScheduleDependentTasks } from '../utils/dateUtils';
import {
  Edit2,
  Trash2,
  Flag,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Layers,
  CheckCircle,
  Clock,
  AlertTriangle,
  GripVertical,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { PhaseEditModal } from './PhaseEditModal';

interface TaskTableViewProps {
  project: Project;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onUpdateProgress: (taskId: string, newProgress: number) => void;
  onReorderTasks?: (newTasks: Task[]) => void;
  onUpdatePhases?: (newPhases: Phase[]) => void;
  onDeletePhase?: (phaseId: string, options?: { deleteTasks?: boolean; moveToPhaseId?: string }) => void;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  project,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onUpdateProgress,
  onReorderTasks,
  onUpdatePhases,
  onDeletePhase,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [editingPhaseModal, setEditingPhaseModal] = useState<Phase | null>(null);
  const [sortField, setSortField] = useState<'wbs' | 'startDate' | 'endDate' | 'progress' | 'custom'>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');

  const phaseMap = new Map<string, { name: string; color: string }>();
  project.phases.forEach((p) => phaseMap.set(p.id, { name: p.name, color: p.color }));

  const taskMap = new Map<string, Task>();
  project.tasks.forEach((t) => taskMap.set(t.id, t));

  // Filter tasks
  const filteredTasks = project.tasks.filter((t) => {
    if (selectedPhase !== 'all' && t.phaseId !== selectedPhase) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchWbs = t.wbs.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.toLowerCase().includes(q);
      const matchLoc = t.location?.toLowerCase().includes(q);
      if (!matchName && !matchWbs && !matchAssignee && !matchLoc) return false;
    }
    return true;
  });

  // Sort
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'wbs') {
      cmp = a.wbs.localeCompare(b.wbs, undefined, { numeric: true });
    } else if (sortField === 'startDate') {
      cmp = a.startDate.localeCompare(b.startDate);
    } else if (sortField === 'endDate') {
      cmp = a.endDate.localeCompare(b.endDate);
    } else if (sortField === 'progress') {
      cmp = a.progress - b.progress;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverRow = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTaskId === targetTaskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'above' : 'below';

    setDragOverTaskId(targetTaskId);
    setDropPosition(pos);
  };

  const handleDropOnRow = (e: React.DragEvent, targetTaskId: string, targetPhaseId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId || !onReorderTasks) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const currentTasks = [...project.tasks];
    const draggedIndex = currentTasks.findIndex((t) => t.id === draggedTaskId);
    if (draggedIndex === -1) return;

    const [draggedItem] = currentTasks.splice(draggedIndex, 1);
    const updatedItem = {
      ...draggedItem,
      phaseId: targetPhaseId,
    };

    const targetIndex = currentTasks.findIndex((t) => t.id === targetTaskId);
    const insertIndex = dropPosition === 'above' ? targetIndex : targetIndex + 1;
    currentTasks.splice(insertIndex, 0, updatedItem);

    const renumbered = renumberProjectWBS(project.phases, currentTasks);
    onReorderTasks(renumbered);

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleAutoRenumberAll = () => {
    if (onReorderTasks) {
      const renumbered = renumberProjectWBS(project.phases, project.tasks);
      onReorderTasks(renumbered);
    }
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 max-w-[1600px] mx-auto p-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋工項、編號、工區或廠商..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>

          <div className="flex items-center gap-1">
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">所有分項工程</option>
              {project.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedPhase !== 'all' && onUpdatePhases && (
              <button
                type="button"
                onClick={() => {
                  const target = project.phases.find((p) => p.id === selectedPhase);
                  if (target) setEditingPhaseModal(target);
                }}
                title="修改此分項名稱與設定"
                className="p-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-slate-500 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReorderTasks && (
            <>
              <button
                onClick={() => {
                  const { updatedTasks, adjustedCount } = autoScheduleDependentTasks(project.tasks);
                  if (adjustedCount > 0) {
                    onReorderTasks(updatedTasks);
                  }
                }}
                title="依照 FS 緊前工作相依關係，自動將開工日期順延至緊前工項完工之次日 (並連動後續工項)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>相依自動排程</span>
              </button>

              <button
                onClick={handleAutoRenumberAll}
                title="重新自動依照目前順序編排 WBS 編號 (如 1.1, 1.2, 2.1...)"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                <span>自動重排 WBS</span>
              </button>
            </>
          )}

          <span className="text-xs text-slate-400 font-mono">
            共 {sortedTasks.length} 項作業
          </span>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增工項作業</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th
                onClick={() => handleSort('wbs')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap w-16"
              >
                <div className="flex items-center gap-1">
                  <span>WBS</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">分項工程</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[200px]">工項作業名稱</th>
              <th
                onClick={() => handleSort('startDate')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>預定開工日</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('endDate')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>預定完工日</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap">工期(天)</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">權重%</th>
              <th
                onClick={() => handleSort('progress')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap min-w-[140px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>實際進度</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">狀態</th>
              <th className="py-3 px-3 whitespace-nowrap">緊前工作 (FS)</th>
              <th className="py-3 px-3 whitespace-nowrap">責任廠商/工班</th>
              <th className="py-3 px-3 whitespace-nowrap">工區/樓層</th>
              <th className="py-3 px-3 text-center whitespace-nowrap w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {sortedTasks.map((task) => {
              const phase = phaseMap.get(task.phaseId);
              const status = determineTaskStatus(task, TODAY_STR);
              const isDragged = draggedTaskId === task.id;

              return (
                <tr
                  key={task.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOverRow(e, task.id)}
                  onDrop={(e) => handleDropOnRow(e, task.id, task.phaseId)}
                  onDragEnd={() => {
                    setDraggedTaskId(null);
                    setDragOverTaskId(null);
                  }}
                  className={`hover:bg-slate-50/80 transition-colors relative group ${
                    isDragged ? 'opacity-30 bg-slate-100' : ''
                  } ${task.isMilestone ? 'bg-amber-50/20' : ''}`}
                >
                  {/* WBS */}
                  <td className="py-2.5 px-3 font-semibold text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span title="按住拖曳可調整工項順序，自動更新 WBS 編號" className="cursor-grab active:cursor-grabbing shrink-0">
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                      </span>
                      <span>{task.wbs}</span>
                    </div>
                  </td>

                  {/* Phase */}
                  <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: phase?.color || '#94a3b8' }}
                    />
                    <span className="text-slate-700">{phase?.name || '-'}</span>
                  </td>

                  {/* Task Name */}
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-2">
                      {task.isMilestone && (
                        <span
                          title={`管制節點: ${task.milestoneCriteria || ''}`}
                          className="w-3.5 h-3.5 rotate-45 bg-amber-500 text-white flex items-center justify-center rounded-2xs shrink-0"
                        >
                          <span className="-rotate-45 text-3xs font-bold">◆</span>
                        </span>
                      )}
                      <span
                        className={`font-medium ${
                          task.isMilestone
                            ? 'font-bold text-amber-900'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.name}
                      </span>
                      {task.isCriticalPath && (
                        <span className="text-3xs px-1 py-0.5 rounded bg-red-100 text-red-700 font-bold font-mono">
                          CPM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="py-2.5 px-3 text-slate-600">
                    {task.startDate}
                  </td>

                  {/* End Date */}
                  <td className="py-2.5 px-3 text-slate-600">
                    {task.endDate}
                  </td>

                  {/* Duration */}
                  <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                    {task.duration}
                  </td>

                  {/* Weight */}
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {task.weight}%
                  </td>

                  {/* Progress Inline Slider & Input */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 justify-end">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={task.progress}
                        onChange={(e) =>
                          onUpdateProgress(task.id, Number(e.target.value))
                        }
                        className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span
                        className={`w-9 text-right font-bold ${
                          task.progress === 100
                            ? 'text-emerald-600'
                            : status === 'delayed'
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.progress}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                    {task.progress >= 100 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        已完成
                      </span>
                    ) : status === 'delayed' ? (
                      <span className="text-red-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        落後延誤
                      </span>
                    ) : status === 'in_progress' ? (
                      <span className="text-blue-700 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        施工中
                      </span>
                    ) : (
                      <span className="text-slate-400">未開始</span>
                    )}
                  </td>

                  {/* Predecessors */}
                  <td className="py-2.5 px-3 text-slate-500 font-sans">
                    {task.predecessors && task.predecessors.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.predecessors.map((pId) => {
                          const pred = taskMap.get(pId);
                          return (
                            <span
                              key={pId}
                              title={pred?.name || pId}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-3xs font-mono"
                            >
                              {pred?.wbs || pId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="py-2.5 px-3 font-sans text-slate-700 whitespace-nowrap">
                    {task.assignee || '-'}
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-3 font-sans text-slate-600 whitespace-nowrap">
                    {task.location || '-'}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 font-sans">
                      <button
                        onClick={() => onEditTask(task)}
                        title="編輯工項"
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        title="刪除工項"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phase Edit Modal */}
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
