import React, { useMemo } from 'react';
import { Project } from '../types/project';
import {
  calculateProjectMetrics,
  generateSCurveData,
  TODAY_STR,
  determineTaskStatus,
  diffDays,
} from '../utils/dateUtils';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  DollarSign,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ProgressDashboardViewProps {
  project: Project;
  onSelectView: (view: any) => void;
}

export const ProgressDashboardView: React.FC<ProgressDashboardViewProps> = ({
  project,
  onSelectView,
}) => {
  const metrics = useMemo(() => calculateProjectMetrics(project), [project]);
  const sCurveData = useMemo(() => generateSCurveData(project), [project]);

  // Delayed tasks
  const delayedTasks = project.tasks.filter(
    (t) => determineTaskStatus(t, TODAY_STR) === 'delayed'
  );

  // Group tasks by phase for phase progress breakdown
  const phaseStats = useMemo(() => {
    return project.phases.map((phase) => {
      const pTasks = project.tasks.filter((t) => t.phaseId === phase.id);
      const taskCount = pTasks.length;
      if (taskCount === 0) {
        return {
          phase,
          taskCount: 0,
          actual: 0,
          planned: 0,
          variance: 0,
        };
      }

      const sumWeight = pTasks.reduce((acc, t) => acc + (t.weight || 1), 0);
      let actualAcc = 0;
      let plannedAcc = 0;

      pTasks.forEach((t) => {
        const w = (t.weight || 1) / sumWeight;
        actualAcc += t.progress * w;
        // planned progress based on today
        if (TODAY_STR >= t.endDate) plannedAcc += 100 * w;
        else if (TODAY_STR > t.startDate) {
          const totalD = diffDays(t.startDate, t.endDate);
          const elapD = diffDays(t.startDate, TODAY_STR);
          const ratio = totalD > 0 ? elapD / totalD : 1;
          plannedAcc += Math.min(100, ratio * 100) * w;
        }
      });

      const actual = Math.round(actualAcc);
      const planned = Math.round(plannedAcc);
      const variance = actual - planned;

      return {
        phase,
        taskCount,
        actual,
        planned,
        variance,
      };
    });
  }, [project]);

  // S-Curve SVG parameters
  const svgWidth = 800;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const pointsCount = sCurveData.length;
  const getX = (index: number) =>
    padLeft + (index / Math.max(1, pointsCount - 1)) * chartW;
  const getY = (val: number) => padTop + chartH - (val / 100) * chartH;

  // Build SVG path for planned line
  const plannedPath = sCurveData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.planned)}`)
    .join(' ');

  // Build SVG path for actual line (up to today or where actual != null)
  const actualPoints = sCurveData.filter((pt) => pt.actual !== null);
  const actualPath = actualPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.actual)}`)
    .join(' ');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Planned vs Actual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>全案累積進度</span>
            <span className="font-mono text-3xs">基準日: {TODAY_STR}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 font-mono">
              {metrics.actualProgress}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / 預定 {metrics.plannedProgress}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-2xs font-semibold">
            {metrics.variance >= 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                超前 +{metrics.variance}%
              </span>
            ) : (
              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                落後 {metrics.variance}%
              </span>
            )}
            <span className="text-slate-400 font-normal">工程進度偏差量</span>
          </div>
        </div>

        {/* Milestone Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>重大管制節點</span>
            <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 font-mono">
              {metrics.milestoneCompleted}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / 共 {metrics.milestoneTotal} 處
            </span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center justify-between">
            <span>節點達成率</span>
            <span className="font-mono font-bold text-slate-700">
              {metrics.milestoneTotal > 0
                ? Math.round(
                    (metrics.milestoneCompleted / metrics.milestoneTotal) * 100
                  )
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Task Counts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>作業狀態統計</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {metrics.completedCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              已完工 / 總計 {project.tasks.length}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-2xs font-mono">
            <span className="text-blue-600">施工中: {metrics.inProgressCount}</span>
            <span className="text-slate-300">|</span>
            <span className={metrics.delayedCount > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>
              落後延誤: {metrics.delayedCount}
            </span>
          </div>
        </div>

        {/* Budget vs Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>合約造價與累計支出</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {project.totalBudget ? project.totalBudget.toLocaleString() : '-'}
            </span>
            <span className="text-xs text-slate-400 font-mono">萬元</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center justify-between">
            <span>累計已估驗：</span>
            <span className="font-mono font-bold text-slate-800">
              {metrics.actualCostTotal.toLocaleString()} 萬元
            </span>
          </div>
        </div>
      </div>

      {/* 2. S-Curve Progress Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>工程累積進度 S-曲線 (S-Curve)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              藍色虛線代表預定排程基線累積進度，綠色實線代表實際累計施工進度。
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-blue-500 border-b-2 border-blue-500 border-dashed" />
              <span className="text-slate-600">預定進度 (Planned)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-emerald-600 rounded-full" />
              <span className="text-slate-800 font-bold">實際進度 (Actual)</span>
            </div>
          </div>
        </div>

        {/* SVG Curve Container */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[650px] font-mono text-3xs select-none"
          >
            {/* Grid Horizontal lines 0%, 25%, 50%, 75%, 100% */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Planned S-Curve line */}
            <path
              d={plannedPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="6,4"
            />

            {/* Actual S-Curve line */}
            {actualPoints.length > 0 && (
              <path
                d={actualPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {/* Actual dots */}
            {actualPoints.map((pt, i) => (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(pt.actual)}
                r="3.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}

            {/* X-axis labels (dates) */}
            {sCurveData.map((pt, i) => {
              if (i % Math.ceil(pointsCount / 8) === 0 || i === pointsCount - 1) {
                return (
                  <text
                    key={pt.date}
                    x={getX(i)}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill="#64748b"
                  >
                    {pt.label}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>
      </div>

      {/* 3. Sub-Project / Phase Breakdown & Delayed Alert Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Breakdown List (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>各分項工程進度與偏差對比</span>
            </h3>
            <button
              onClick={() => onSelectView('gantt')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <span>查看甘特圖細部</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {phaseStats.map(({ phase, taskCount, actual, planned, variance }) => (
              <div
                key={phase.id}
                className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60 text-xs space-y-2"
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="text-slate-900">{phase.name}</span>
                    <span className="text-slate-400 font-normal">
                      ({taskCount} 項作業)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-700">實際: {actual}%</span>
                    <span className="text-slate-400">/ 預定: {planned}%</span>
                    <span
                      className={`font-bold ${
                        variance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {variance >= 0 ? `+${variance}%` : `${variance}%`}
                    </span>
                  </div>
                </div>

                {/* Dual Progress Track: Planned background bar + Actual fill */}
                <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  {/* Planned marker */}
                  <div
                    style={{ width: `${planned}%` }}
                    className="absolute top-0 bottom-0 bg-blue-300/80 rounded-full"
                  />
                  {/* Actual fill */}
                  <div
                    style={{
                      width: `${actual}%`,
                      backgroundColor:
                        actual >= 100
                          ? '#10b981'
                          : variance < -10
                          ? '#ef4444'
                          : phase.color,
                    }}
                    className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delayed / Attention Needed Box (1 col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>落後預警工項 ({delayedTasks.length})</span>
            </h3>
          </div>

          {delayedTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-700">進度掌控良好</div>
              <div className="text-3xs text-slate-400 mt-1">目前無落後超過容許範圍之工項。</div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {delayedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs text-red-700 font-bold">
                      {task.wbs}
                    </span>
                    <span className="text-2xs text-red-600 font-mono font-bold">
                      進度 {task.progress}%
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate">
                    {task.name}
                  </div>
                  <div className="text-3xs text-slate-500 font-mono flex items-center justify-between">
                    <span>期限: {task.endDate}</span>
                    <span>負責: {task.assignee || '未指派'}</span>
                  </div>
                  {task.notes && (
                    <div className="text-3xs text-red-800 bg-white/70 p-1.5 rounded border border-red-100">
                      備註: {task.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
