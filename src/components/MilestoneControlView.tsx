import React, { useState } from 'react';
import { Project, Task, MilestoneType } from '../types/project';
import { diffDays, TODAY_STR, determineTaskStatus } from '../utils/dateUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  FileCheck,
  Building2,
  Plus,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface MilestoneControlViewProps {
  project: Project;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
  onToggleComplete: (taskId: string, currentProgress: number) => void;
}

export const MilestoneControlView: React.FC<MilestoneControlViewProps> = ({
  project,
  onEditTask,
  onAddTask,
  onToggleComplete,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const milestoneTasks = project.tasks
    .filter((t) => t.isMilestone)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const filteredMilestones = milestoneTasks.filter((t) => {
    if (filterType === 'all') return true;
    return t.milestoneType === filterType;
  });

  const phaseMap = new Map<string, string>();
  project.phases.forEach((p) => phaseMap.set(p.id, p.name));

  const totalMilestones = milestoneTasks.length;
  const completedMilestones = milestoneTasks.filter((t) => t.progress >= 100).length;
  const delayedMilestones = milestoneTasks.filter(
    (t) => determineTaskStatus(t, TODAY_STR) === 'delayed'
  ).length;
  const pendingMilestones = totalMilestones - completedMilestones;

  // Find next upcoming milestone
  const nextMilestone = milestoneTasks.find(
    (t) => t.progress < 100 && t.startDate >= TODAY_STR
  );
  const nextDays = nextMilestone ? diffDays(TODAY_STR, nextMilestone.startDate) : null;

  const milestoneTypeLabels: Record<MilestoneType, { label: string; color: string }> = {
    contract: { label: '契約點', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    permit: { label: '行政許可/執照', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    inspection: { label: '現場查驗/隱蔽', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    payment: { label: '計價撥款節點', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completion: { label: '完工驗收點交', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Total Milestones */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">工程管制節點總數</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {totalMilestones} <span className="text-xs font-normal text-slate-400">處</span>
            </div>
            <div className="text-2xs text-slate-400 mt-1">分佈於各關鍵分項工程</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Flag className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        {/* Card 2: Completed Milestones */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">已達成並驗收</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
              {completedMilestones} <span className="text-xs font-normal text-slate-400">/ {totalMilestones}</span>
            </div>
            <div className="text-2xs text-emerald-600 mt-1">
              達成率 {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Delayed/At Risk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">落後或警戒節點</div>
            <div className={`text-2xl font-bold mt-1 font-mono ${delayedMilestones > 0 ? 'text-red-600' : 'text-slate-700'}`}>
              {delayedMilestones} <span className="text-xs font-normal text-slate-400">處</span>
            </div>
            <div className="text-2xs text-slate-400 mt-1">
              {delayedMilestones > 0 ? '需召開趕工協調會議' : '目前時程正常受控'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Next Milestone Countdown */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">距離下個管制節點</div>
            <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
              {nextDays !== null ? (
                <>
                  {nextDays} <span className="text-xs font-normal text-slate-400">天</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400">已全數完成</span>
              )}
            </div>
            <div className="text-2xs text-slate-500 mt-1 truncate max-w-[180px]">
              {nextMilestone?.name || '無待辦管制節點'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Control Node List & Inspection Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <span>重大工程節點管制清冊</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              設定與控管分項工程之合約關鍵查驗點、法規建照使照、隱蔽工程抽查及計價估驗節點。
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter by milestone type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">所有管制節點類別</option>
              <option value="permit">行政許可 / 執照核發</option>
              <option value="inspection">現場查驗 / 隱蔽工程</option>
              <option value="payment">估驗計價撥款</option>
              <option value="completion">完工驗收點交</option>
            </select>

            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增管制節點</span>
            </button>
          </div>
        </div>

        {/* Milestone Cards / Rows */}
        <div className="divide-y divide-slate-100">
          {filteredMilestones.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Flag className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <div className="text-sm font-medium text-slate-600">目前尚無符合條件的管制節點</div>
              <div className="text-xs text-slate-400 mt-1">
                可在工項編輯視窗中勾選「設為工程管制節點 / 里程碑」以納入管制。
              </div>
            </div>
          ) : (
            filteredMilestones.map((milestone, idx) => {
              const status = determineTaskStatus(milestone, TODAY_STR);
              const isDone = milestone.progress >= 100;
              const daysRemaining = diffDays(TODAY_STR, milestone.startDate);
              const typeConfig = milestone.milestoneType
                ? milestoneTypeLabels[milestone.milestoneType]
                : { label: '重大管制點', color: 'bg-slate-100 text-slate-700 border-slate-200' };

              return (
                <div
                  key={milestone.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDone
                      ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                      : status === 'delayed'
                      ? 'bg-red-50/30 hover:bg-red-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: Sequence + Diamond + Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Checkbox to toggle Done */}
                    <button
                      onClick={() => onToggleComplete(milestone.id, milestone.progress)}
                      title={isDone ? '標記為未完成' : '標記為查驗合格完成 (100%)'}
                      className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'border-2 border-slate-300 hover:border-emerald-500 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Top line: WBS, Phase, Category, Milestone Name */}
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {milestone.wbs}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {phaseMap.get(milestone.phaseId) || '分項工程'}
                        </span>
                        <span
                          className={`text-2xs font-semibold px-2 py-0.5 rounded border ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </span>
                        {milestone.isCriticalPath && (
                          <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            關鍵路徑 (CPM)
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        className={`text-sm font-bold ${
                          isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {milestone.name}
                      </h3>

                      {/* Verification Criteria / Standards */}
                      {milestone.milestoneCriteria && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-amber-50/60 p-2 rounded-md border border-amber-200/60 mt-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-800">查驗管制標準：</span>
                            <span>{milestone.milestoneCriteria}</span>
                          </div>
                        </div>
                      )}

                      {/* Location & Assignee */}
                      <div className="flex items-center gap-3 text-2xs text-slate-500 pt-0.5">
                        {milestone.assignee && (
                          <span>負責廠商: {milestone.assignee}</span>
                        )}
                        {milestone.location && (
                          <>
                            <span>·</span>
                            <span>工區: {milestone.location}</span>
                          </>
                        )}
                        {milestone.weight && (
                          <>
                            <span>·</span>
                            <span>權重: {milestone.weight}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Date, Countdown & Status */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                    {/* Target Date */}
                    <div className="text-right">
                      <div className="text-2xs text-slate-400 font-medium">管制目標日</div>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {milestone.startDate}
                      </div>
                      <div className="text-3xs font-mono mt-0.5">
                        {isDone ? (
                          <span className="text-emerald-600 font-semibold">
                            已於 {milestone.completedDate || milestone.startDate} 查驗合格
                          </span>
                        ) : daysRemaining < 0 ? (
                          <span className="text-red-600 font-bold">
                            已逾期 {Math.abs(daysRemaining)} 天！
                          </span>
                        ) : daysRemaining === 0 ? (
                          <span className="text-amber-600 font-bold">今天到期查驗</span>
                        ) : (
                          <span className="text-blue-600 font-semibold">
                            尚餘 {daysRemaining} 天
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Badge */}
                    <div className="text-right w-16">
                      <div className="text-2xs text-slate-400 font-medium">達成進度</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          isDone
                            ? 'text-emerald-600'
                            : status === 'delayed'
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {milestone.progress}%
                      </div>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => onEditTask(milestone)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                    >
                      管制設定
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
