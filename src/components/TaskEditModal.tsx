import React, { useState, useEffect } from 'react';
import { Project, Task, MilestoneType } from '../types/project';
import { calculateDuration, addDays, TODAY_STR } from '../utils/dateUtils';
import { X, Flag, Calendar, Link2, Check, Calculator } from 'lucide-react';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task, options?: { autoWeightByBudget?: boolean }) => void;
  project: Project;
  initialTask?: Task | null;
  defaultPhaseId?: string;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  project,
  initialTask,
  defaultPhaseId,
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    wbs: '1.1',
    phaseId: defaultPhaseId || project.phases[0]?.id || '',
    startDate: TODAY_STR,
    endDate: addDays(TODAY_STR, 7),
    duration: 8,
    progress: 0,
    isMilestone: false,
    milestoneType: 'inspection',
    milestoneCriteria: '',
    isCriticalPath: false,
    predecessors: [],
    assignee: '',
    location: '',
    weight: 5,
    budgetCost: 0,
    actualCost: 0,
    notes: '',
  });

  const [autoSyncWeightOnBudget, setAutoSyncWeightOnBudget] = useState<boolean>(true);
  const [recalcAllOnSave, setRecalcAllOnSave] = useState<boolean>(false);

  useEffect(() => {
    setAutoSyncWeightOnBudget(true);
    setRecalcAllOnSave(false);
    if (initialTask) {
      setFormData({ ...initialTask });
    } else {
      const pId = defaultPhaseId || project.phases[0]?.id || '';
      const existingInPhase = project.tasks.filter((t) => t.phaseId === pId);
      const phaseObj = project.phases.find((p) => p.id === pId);
      const phaseNum = phaseObj ? phaseObj.order : 1;
      const nextWbs = `${phaseNum}.${existingInPhase.length + 1}`;

      setFormData({
        name: '',
        wbs: nextWbs,
        phaseId: pId,
        startDate: TODAY_STR,
        endDate: addDays(TODAY_STR, 7),
        duration: 8,
        progress: 0,
        isMilestone: false,
        milestoneType: 'inspection',
        milestoneCriteria: '',
        isCriticalPath: false,
        predecessors: [],
        assignee: '',
        location: '',
        weight: 5,
        budgetCost: 0,
        actualCost: 0,
        notes: '',
      });
    }
  }, [initialTask, defaultPhaseId, isOpen, project]);

  // Sum of budgetCost from all other tasks in the project
  const otherTasksBudget = React.useMemo(() => {
    return project.tasks
      .filter((t) => !initialTask || t.id !== initialTask.id)
      .reduce((sum, t) => sum + Math.max(0, Number(t.budgetCost) || 0), 0);
  }, [project.tasks, initialTask]);

  const currentTaskBudget = Math.max(0, Number(formData.budgetCost) || 0);
  const projectedTotalBudget = otherTasksBudget + currentTaskBudget;
  const calculatedSharePct =
    projectedTotalBudget > 0
      ? Math.round(((currentTaskBudget / projectedTotalBudget) * 100) * 10) / 10
      : 0;

  // Other tasks available as predecessors (excluding self)
  const candidatePredecessors = project.tasks.filter(
    (t) => !initialTask || t.id !== initialTask.id
  );

  // Find latest predecessor end date for guidance
  const latestPredecessorEndDate = React.useMemo(() => {
    if (!formData.predecessors || formData.predecessors.length === 0) return null;
    let maxDate = '';
    candidatePredecessors.forEach((cand) => {
      if (formData.predecessors?.includes(cand.id)) {
        if (!maxDate || cand.endDate > maxDate) {
          maxDate = cand.endDate;
        }
      }
    });
    return maxDate || null;
  }, [formData.predecessors, candidatePredecessors]);

  if (!isOpen) return null;

  const handleStartDateChange = (newStart: string) => {
    let effectiveStart = newStart;
    if (latestPredecessorEndDate) {
      const minAllowed = addDays(latestPredecessorEndDate, 1);
      if (effectiveStart < minAllowed) {
        effectiveStart = minAllowed;
      }
    }
    const dur = formData.duration || 1;
    const newEnd = addDays(effectiveStart, Math.max(0, dur - 1));
    setFormData((prev) => ({
      ...prev,
      startDate: effectiveStart,
      endDate: newEnd,
      duration: dur,
    }));
  };

  const handleEndDateChange = (newEnd: string) => {
    if (newEnd < (formData.startDate || '')) {
      return;
    }
    const newDur = calculateDuration(formData.startDate || newEnd, newEnd);
    setFormData((prev) => ({
      ...prev,
      endDate: newEnd,
      duration: newDur,
    }));
  };

  const handleDurationChange = (days: number) => {
    const validDays = Math.max(1, days);
    const newEnd = addDays(formData.startDate || TODAY_STR, validDays - 1);
    setFormData((prev) => ({
      ...prev,
      duration: validDays,
      endDate: newEnd,
    }));
  };

  const togglePredecessor = (predId: string) => {
    const current = formData.predecessors || [];
    let updatedPreds: string[];
    if (current.includes(predId)) {
      updatedPreds = current.filter((id) => id !== predId);
    } else {
      updatedPreds = [...current, predId];
    }

    // Auto-calculate earliest start date from all selected predecessors
    let maxPredEnd = '';
    candidatePredecessors.forEach((cand) => {
      if (updatedPreds.includes(cand.id)) {
        if (!maxPredEnd || cand.endDate > maxPredEnd) {
          maxPredEnd = cand.endDate;
        }
      }
    });

    const dur = formData.duration || 1;
    let newStart = formData.startDate || TODAY_STR;
    let newEnd = formData.endDate || TODAY_STR;

    if (maxPredEnd) {
      const minAllowedStart = addDays(maxPredEnd, 1);
      // If current start is before predecessor end, automatically shift to after predecessor
      if (newStart < minAllowedStart) {
        newStart = minAllowedStart;
        newEnd = addDays(newStart, dur - 1);
      }
    }

    setFormData((prev) => ({
      ...prev,
      predecessors: updatedPreds,
      startDate: newStart,
      endDate: newEnd,
      duration: dur,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    let finalStart = formData.startDate || TODAY_STR;
    let finalEnd = formData.endDate || TODAY_STR;
    const dur = formData.duration || 1;

    // Enforce dependency rule: cannot start before latest predecessor ends
    if (latestPredecessorEndDate) {
      const minAllowed = addDays(latestPredecessorEndDate, 1);
      if (finalStart < minAllowed) {
        finalStart = minAllowed;
        finalEnd = addDays(finalStart, dur - 1);
      }
    }

    const task: Task = {
      id: initialTask?.id || `task-${Date.now()}`,
      phaseId: formData.phaseId || project.phases[0].id,
      wbs: formData.wbs?.trim() || '1.1',
      name: formData.name.trim(),
      startDate: finalStart,
      endDate: finalEnd,
      duration: calculateDuration(finalStart, finalEnd),
      progress: Math.min(100, Math.max(0, Number(formData.progress) || 0)),
      isMilestone: !!formData.isMilestone,
      milestoneType: formData.isMilestone ? (formData.milestoneType as MilestoneType) : undefined,
      milestoneCriteria: formData.isMilestone ? formData.milestoneCriteria?.trim() : undefined,
      isCriticalPath: !!formData.isCriticalPath,
      predecessors: formData.predecessors || [],
      assignee: formData.assignee?.trim() || '',
      location: formData.location?.trim() || '',
      weight: Number(formData.weight) || 0,
      budgetCost: Number(formData.budgetCost) || 0,
      actualCost: Number(formData.actualCost) || 0,
      notes: formData.notes?.trim() || '',
      completedDate: formData.progress === 100 ? (formData.completedDate || TODAY_STR) : undefined,
    };

    onSave(task, { autoWeightByBudget: recalcAllOnSave });
    onClose();
  };

  const handleBudgetChange = (rawVal: string) => {
    const cost = Math.max(0, Number(rawVal) || 0);
    const nextTotal = otherTasksBudget + cost;
    const nextShare =
      nextTotal > 0 ? Math.round(((cost / nextTotal) * 100) * 10) / 10 : 0;

    if (autoSyncWeightOnBudget && nextTotal > 0) {
      setFormData((prev) => ({
        ...prev,
        budgetCost: cost,
        weight: nextShare,
      }));
      setRecalcAllOnSave(true);
    } else {
      setFormData((prev) => ({
        ...prev,
        budgetCost: cost,
      }));
    }
  };

  const handleManualWeightChange = (rawVal: string) => {
    const w = Math.max(0, Math.min(100, Number(rawVal) || 0));
    setFormData((prev) => ({
      ...prev,
      weight: w,
    }));
    // Respect manual weight adjustment instead of overwriting on save
    setRecalcAllOnSave(false);
  };

  const handleApplyShareNow = () => {
    if (projectedTotalBudget <= 0) return;
    setFormData((prev) => ({
      ...prev,
      weight: calculatedSharePct,
    }));
    setRecalcAllOnSave(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {formData.isMilestone ? <Flag className="w-4 h-4 fill-amber-500 text-amber-500" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialTask ? '編輯工項作業' : '新增工項作業'}
              </h2>
              <p className="text-xs text-slate-500">
                設定工項排程、分項所屬、相依前置關係與管制節點標準。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Row 1: Phase & WBS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                所屬分項工程 *
              </label>
              <select
                value={formData.phaseId}
                onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                {project.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                WBS 編號 *
              </label>
              <input
                type="text"
                value={formData.wbs}
                onChange={(e) => setFormData({ ...formData, wbs: e.target.value })}
                placeholder="例如: 2.3"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Row 2: Task Name */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              工項 / 作業名稱 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: B3F 基礎大底版鋼筋綁紮與混凝土澆置"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              required
            />
          </div>

          {/* Row 3: Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                預定開工日
              </label>
              <input
                type="date"
                value={formData.startDate}
                min={latestPredecessorEndDate ? addDays(latestPredecessorEndDate, 1) : undefined}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                required
              />
              {latestPredecessorEndDate && (
                <div className="text-3xs text-blue-700 font-medium mt-1">
                  約束：最早已對齊至 {addDays(latestPredecessorEndDate, 1)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                預定完工日
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                工期 (天數)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Row 4: Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">
                目前實際進度 %
              </label>
              <span className="font-mono font-bold text-blue-600">
                {formData.progress}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Row 4b: Budget & Weight Calculation */}
          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>預算金額與權重設定（支援手動調整或依金額佔比自動計算）</span>
              </div>
              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSyncWeightOnBudget}
                  onChange={(e) => setAutoSyncWeightOnBudget(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>輸入預算時自動依佔比帶入權重</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  工項預算金額 (萬元)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.budgetCost}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">
                    全案權重 %
                  </label>
                  {projectedTotalBudget > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyShareNow}
                      className="text-3xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      套用金額佔比 ({calculatedSharePct}%)
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleManualWeightChange(e.target.value)}
                  placeholder="例如: 8"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/50 text-3xs text-slate-600">
              <div className="font-mono">
                佔比試算：分子{' '}
                <span className="font-bold text-slate-900">{currentTaskBudget.toLocaleString()}</span>
                {' ÷ '}
                全案總預算{' '}
                <span className="font-bold text-slate-900">{projectedTotalBudget.toLocaleString()}</span> 萬元
                {' = '}
                <span className="font-bold text-blue-700">{calculatedSharePct}%</span>
              </div>

              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none font-sans">
                <input
                  type="checkbox"
                  checked={recalcAllOnSave}
                  onChange={(e) => setRecalcAllOnSave(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>儲存時同步依金額重算全案所有工項權重（總和 100%）</span>
              </label>
            </div>
          </div>

          {/* Row 5: Control Node / Milestone Toggle Section */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isMilestone}
                  onChange={(e) => setFormData({ ...formData, isMilestone: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-amber-500 fill-amber-500" />
                  設為工程重大管制節點 / 里程碑 (Milestone Control Node)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isCriticalPath}
                  onChange={(e) => setFormData({ ...formData, isCriticalPath: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <span className="font-semibold text-red-700">
                  關鍵路徑 (CPM)
                </span>
              </label>
            </div>

            {formData.isMilestone && (
              <div className="space-y-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-150">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    管制節點類別
                  </label>
                  <select
                    value={formData.milestoneType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        milestoneType: e.target.value as MilestoneType,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                  >
                    <option value="inspection">現場查驗 / 隱蔽工程查驗 (如底板灌漿、配筋檢驗)</option>
                    <option value="permit">行政許可 / 法規執照 (如建造執照、使用執照、消防合格)</option>
                    <option value="payment">估驗計價撥款節點 (如結構體封頂、永久送電)</option>
                    <option value="completion">完工驗收點交節點 (如業主驗收、保固起算)</option>
                    <option value="contract">合約重大期限管制點</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    管制查驗標準 / 檢驗條件 (Verification Criteria)
                  </label>
                  <input
                    type="text"
                    value={formData.milestoneCriteria}
                    onChange={(e) =>
                      setFormData({ ...formData, milestoneCriteria: e.target.value })
                    }
                    placeholder="例如: 鋼筋無銹蝕防蝕搭接檢驗、配比坍度試驗合格、監造簽證"
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 6: Predecessors / Dependencies */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600" />
                <span>緊前工作 / 前置工項相依關係 (FS: Finish-to-Start)</span>
              </label>
              <span className="text-3xs text-slate-400 font-mono">
                已選 {formData.predecessors?.length || 0} 項
              </span>
            </div>

            {latestPredecessorEndDate && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">緊前排程連動：</span>
                  所選緊前工項最晚於 <span className="font-mono font-bold text-blue-800">{latestPredecessorEndDate}</span> 完工，已自動將本工項起始日期調整至緊前完工之次日 <span className="font-mono font-bold text-blue-800">{addDays(latestPredecessorEndDate, 1)}</span> 施工。
                </div>
              </div>
            )}

            <div className="max-h-28 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
              {candidatePredecessors.map((cand) => {
                const isSelected = formData.predecessors?.includes(cand.id);
                return (
                  <button
                    type="button"
                    key={cand.id}
                    onClick={() => togglePredecessor(cand.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-1">
                      <span className="font-mono font-semibold text-slate-500 mr-1.5">
                        {cand.wbs}
                      </span>
                      {cand.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 7: Contractor & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                責任廠商 / 工班
              </label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder="例如: 國產實業 / 鋼筋班"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                工區 / 樓層
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="例如: B3F 筏基底板"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 8: Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              工程備註與施工安全查驗點
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="例如: 預定出動 4 輛泵浦車、日夜連續澆置 3,600 立方公尺，做好交管與噪音防護。"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {initialTask ? '儲存變更' : '新增工項'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
