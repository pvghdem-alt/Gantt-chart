import React, { useState, useEffect } from 'react';
import { Project, Task, Phase } from '../types/project';
import { TODAY_STR, determineTaskStatus, renumberProjectWBS, autoScheduleDependentTasks } from '../utils/dateUtils';
import {
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ListOrdered,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { PhaseEditModal } from './PhaseEditModal';

interface InlineNumericInputProps {
  value: number;
  step?: string;
  min?: number;
  max?: number;
  suffix?: string;
  title?: string;
  className?: string;
  onCommit: (nextValue: number) => void;
}

const InlineNumericInput: React.FC<InlineNumericInputProps> = ({
  value,
  step = 'any',
  min = 0,
  max,
  suffix,
  title,
  className = '',
  onCommit,
}) => {
  const [draft, setDraft] = useState<string>(String(value ?? 0));

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  const commitValue = () => {
    const parsed = Number(draft);
    let next = Number.isFinite(parsed) ? parsed : 0;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setDraft(String(next));
    if (next !== value) {
      onCommit(next);
    }
  };

  return (
    <div className="inline-flex items-center justify-end gap-1">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        title={title}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(String(value ?? 0));
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={`w-20 px-1.5 py-1 text-right font-mono text-xs border border-slate-200 rounded bg-white hover:border-blue-300 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${className}`}
      />
      {suffix && <span className="text-slate-400 text-3xs font-mono">{suffix}</span>}
    </div>
  );
};

interface TaskTableViewProps {
  project: Project;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onUpdateProgress: (taskId: string, newProgress: number) => void;
  onReorderTasks?: (newTasks: Task[]) => void;
  onUpdatePhases?: (newPhases: Phase[]) => void;
  onDeletePhase?: (phaseId: string, options?: { deleteTasks?: boolean; moveToPhaseId?: string }) => void;
  onUpdateTaskBudget?: (taskId: string, budgetCost: number, autoRecalcWeights: boolean) => void;
  onUpdateTaskWeight?: (taskId: string, weight: number) => void;
  onRecalculateWeightsByBudget?: () => void;
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
  onUpdateTaskBudget,
  onUpdateTaskWeight,
  onRecalculateWeightsByBudget,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [editingPhaseModal, setEditingPhaseModal] = useState<Phase | null>(null);
  const [sortField, setSortField] = useState<
    'wbs' | 'startDate' | 'endDate' | 'progress' | 'budgetCost' | 'weight' | 'custom'
  >('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [autoWeightByBudget, setAutoWeightByBudget] = useState<boolean>(true);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!feedbackNotice) return;
    const timer = setTimeout(() => setFeedbackNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackNotice]);

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
    } else if (sortField === 'budgetCost') {
      cmp = (Number(a.budgetCost) || 0) - (Number(b.budgetCost) || 0);
    } else if (sortField === 'weight') {
      cmp = (Number(a.weight) || 0) - (Number(b.weight) || 0);
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

  // Totals across the entire project (denominator for weight calculation)
  const totalProjectBudget = project.tasks.reduce(
    (sum, t) => sum + Math.max(0, Number(t.budgetCost) || 0),
    0
  );
  const totalProjectWeight =
    Math.round(project.tasks.reduce((sum, t) => sum + (Number(t.weight) || 0), 0) * 10) / 10;

  // Subtotals for currently filtered view
  const filteredBudgetSum = sortedTasks.reduce(
    (sum, t) => sum + Math.max(0, Number(t.budgetCost) || 0),
    0
  );
  const filteredWeightSum =
    Math.round(sortedTasks.reduce((sum, t) => sum + (Number(t.weight) || 0), 0) * 10) / 10;

  const handleTriggerRecalculateWeights = () => {
    if (totalProjectBudget <= 0) {
      setFeedbackNotice({
        type: 'warning',
        text: '目前所有工項的預算金額總和為 0 萬元，請先輸入各工項預算金額再進行比例計算。',
      });
      return;
    }
    onRecalculateWeightsByBudget?.();
    setFeedbackNotice({
      type: 'success',
      text: `已依全案總預算 ${totalProjectBudget.toLocaleString()} 萬元，自動計算並更新 ${project.tasks.length} 項工項權重（合計 100%）。`,
    });
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

          {/* Budget -> Weight Auto-Sync Toggle */}
          <label
            title="開啟後，在表格中直接修改任一工項預算金額時，系統會自動加總全案預算並重算所有工項權重"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50/50 text-xs text-slate-700 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={autoWeightByBudget}
              onChange={(e) => setAutoWeightByBudget(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">輸入預算自動算權重</span>
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRecalculateWeightsByBudget && (
            <button
              type="button"
              onClick={handleTriggerRecalculateWeights}
              title="加總全案所有工項預算金額作為分母，依各工項預算佔比自動更新權重%"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>依預算重算全案權重</span>
            </button>
          )}

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

      {/* Inline Feedback Notice */}
      {feedbackNotice && (
        <div
          className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{feedbackNotice.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-xs underline ml-3 opacity-80 hover:opacity-100"
          >
            關閉
          </button>
        </div>
      )}

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
              <th
                onClick={() => handleSort('budgetCost')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>預算(萬元)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('weight')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>權重%</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
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
              const taskBudget = Math.max(0, Number(task.budgetCost) || 0);

              return (
                <tr
                  key={task.id}
                  className={`hover:bg-slate-50/80 transition-colors relative group ${
                    task.isMilestone ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* WBS (static display, mouse drag disabled in TaskTableView) */}
                  <td className="py-2.5 px-3 font-semibold text-slate-500 whitespace-nowrap select-text">
                    <span>{task.wbs}</span>
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
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {task.startDate}
                  </td>

                  {/* End Date */}
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {task.endDate}
                  </td>

                  {/* Duration */}
                  <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                    {task.duration}
                  </td>

                  {/* Budget Cost (Inline Editable) */}
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    {onUpdateTaskBudget ? (
                      <InlineNumericInput
                        value={taskBudget}
                        min={0}
                        step="any"
                        title="輸入預算金額(萬元)，離開欄位或按 Enter 儲存；若開啟自動算權重將同步重算全案佔比"
                        onCommit={(nextCost) =>
                          onUpdateTaskBudget(task.id, nextCost, autoWeightByBudget)
                        }
                      />
                    ) : (
                      <span className="text-slate-700">{taskBudget.toLocaleString()}</span>
                    )}
                  </td>

                  {/* Weight (Inline Manually Editable or Auto-Calculated) */}
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    {onUpdateTaskWeight ? (
                      <InlineNumericInput
                        value={Number(task.weight) || 0}
                        min={0}
                        max={100}
                        step="0.1"
                        suffix="%"
                        title="可直接手動輸入權重%，或由預算金額佔比自動計算"
                        className="w-16"
                        onCommit={(nextWeight) => onUpdateTaskWeight(task.id, nextWeight)}
                      />
                    ) : (
                      <span className="text-slate-600">{task.weight}%</span>
                    )}
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
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-xs text-slate-700">
              <td colSpan={6} className="py-2.5 px-3 text-right font-sans">
                {sortedTasks.length !== project.tasks.length ? (
                  <span>
                    篩選小計（{sortedTasks.length} 項） / 全案合計（{project.tasks.length} 項）：
                  </span>
                ) : (
                  <span>全案合計（{project.tasks.length} 項工項，權重分母為全案總預算）：</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                {sortedTasks.length !== project.tasks.length ? (
                  <div>
                    <span>{filteredBudgetSum.toLocaleString()}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-blue-700">{totalProjectBudget.toLocaleString()} 萬元</span>
                  </div>
                ) : (
                  <span className="text-blue-700">{totalProjectBudget.toLocaleString()} 萬元</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5">
                  {sortedTasks.length !== project.tasks.length && (
                    <span className="text-slate-500">{filteredWeightSum}% /</span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      Math.abs(totalProjectWeight - 100) <= 0.1
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                    title={
                      Math.abs(totalProjectWeight - 100) <= 0.1
                        ? '全案權重總和為 100%'
                        : '目前權重總和非 100%，可手動調整或點擊「依預算重算全案權重」'
                    }
                  >
                    {totalProjectWeight}%
                  </span>
                </div>
              </td>
              <td colSpan={6} className="py-2.5 px-3 text-3xs text-slate-400 font-sans">
                提示：可直接輸入「預算(萬元)」自動依金額佔比算出權重，或手動調整「權重%」。
              </td>
            </tr>
          </tfoot>
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
