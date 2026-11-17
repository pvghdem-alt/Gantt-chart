import React, { useState } from 'react';
import { Project, Task } from '../types/project';
import {
  calculateProjectMetrics,
  determineTaskStatus,
  TODAY_STR,
  diffDays,
} from '../utils/dateUtils';
import {
  Building2,
  FolderKanban,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flag,
  DollarSign,
  Search,
  Filter,
  Copy,
  Trash2,
  Sliders,
  Calendar,
  Layers,
} from 'lucide-react';

interface PortfolioOverviewViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string, targetView?: 'gantt' | 'milestones' | 'analytics') => void;
  onCreateProject: () => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const PortfolioOverviewView: React.FC<PortfolioOverviewViewProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [filter, setFilter] = useState<'all' | 'delayed' | 'in_progress'>('all');
  const [search, setSearch] = useState('');

  // Cross-project calculations
  const totalProjects = projects.length;
  let totalMilestones = 0;
  let totalMilestonesCompleted = 0;
  let totalBudgetSum = 0;
  let delayedProjectsCount = 0;

  const projectStats = projects.map((proj) => {
    const metrics = calculateProjectMetrics(proj);
    totalMilestones += metrics.milestoneTotal;
    totalMilestonesCompleted += metrics.milestoneCompleted;
    totalBudgetSum += proj.totalBudget || 0;

    const isBehind = metrics.variance < -5 || metrics.delayedCount > 0;
    if (isBehind) delayedProjectsCount++;

    return {
      project: proj,
      metrics,
      isBehind,
      daysToEnd: diffDays(TODAY_STR, proj.targetEndDate),
    };
  });

  // Filtered projects
  const filteredList = projectStats.filter(({ project, isBehind }) => {
    if (filter === 'delayed' && !isBehind) return false;
    if (filter === 'in_progress' && project.status === 'completed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = project.name.toLowerCase().includes(q);
      const matchCode = project.code.toLowerCase().includes(q);
      const matchClient = project.client?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchClient) return false;
    }
    return true;
  });

  // Collect upcoming cross-project critical milestones across all projects (next 30 days)
  const upcomingCrossMilestones: {
    project: Project;
    task: Task;
    days: number;
    status: string;
  }[] = [];

  projects.forEach((proj) => {
    proj.tasks
      .filter((t) => t.isMilestone && t.progress < 100)
      .forEach((t) => {
        const days = diffDays(TODAY_STR, t.startDate);
        const status = determineTaskStatus(t, TODAY_STR);
        upcomingCrossMilestones.push({
          project: proj,
          task: t,
          days,
          status,
        });
      });
  });

  upcomingCrossMilestones.sort((a, b) => a.task.startDate.localeCompare(b.task.startDate));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* 1. Portfolio Cross-Project KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">管制中工程總數</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {totalProjects} <span className="text-xs font-normal text-slate-400">個工程專案</span>
            </div>
            <div className="text-2xs text-slate-400 mt-1">跨專案多工程同步管制</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        {/* Schedule Risk Alert */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">進度落後預警專案</div>
            <div
              className={`text-2xl font-bold mt-1 font-mono ${
                delayedProjectsCount > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {delayedProjectsCount} <span className="text-xs font-normal text-slate-400">個專案</span>
            </div>
            <div className="text-2xs text-slate-400 mt-1">
              {delayedProjectsCount > 0 ? '需檢討工期趕工對策' : '各工程進度皆在掌控中'}
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
              delayedProjectsCount > 0
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Cross-Project Milestones */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">全工程重大管制節點</div>
            <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
              {totalMilestonesCompleted}{' '}
              <span className="text-xs font-normal text-slate-400">/ {totalMilestones} 處</span>
            </div>
            <div className="text-2xs text-slate-500 mt-1">
              達成率{' '}
              {totalMilestones > 0
                ? Math.round((totalMilestonesCompleted / totalMilestones) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Flag className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        {/* Total Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">在建工程合約總造價</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {totalBudgetSum.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">萬元</span>
            </div>
            <div className="text-2xs text-slate-400 mt-1">約 {(totalBudgetSum / 10000).toFixed(2)} 億元</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Project List & Search / Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋工程名稱、標案編號或業主..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-64"
              />
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                全部工程 ({projects.length})
              </button>
              <button
                onClick={() => setFilter('delayed')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                  filter === 'delayed'
                    ? 'bg-white text-red-900 shadow-2xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>落後警戒 ({delayedProjectsCount})</span>
              </button>
            </div>
          </div>

          <button
            onClick={onCreateProject}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>新增工程專案</span>
          </button>
        </div>

        {/* Project Cards Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(({ project: proj, metrics, isBehind, daysToEnd }) => {
            const isCurrent = proj.id === activeProjectId;

            return (
              <div
                key={proj.id}
                className={`rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/15 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Code + Current Tag + Actions */}
                  <div className="flex items-center justify-between text-2xs mb-2">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {proj.code}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold font-sans">
                          目前編輯中
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDuplicateProject(proj.id)}
                        title="複製此工程排程"
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          title="刪除此工程"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectProject(proj.id, 'gantt')}
                    className="text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors line-clamp-2"
                  >
                    {proj.name}
                  </h3>

                  {/* Client & Contractor */}
                  <div className="text-2xs text-slate-500 mt-2 space-y-0.5">
                    <div className="truncate">業主：{proj.client}</div>
                    <div className="truncate">承造：{proj.contractor}</div>
                    <div className="font-mono text-slate-400">
                      期程：{proj.startDate} ~ {proj.targetEndDate}
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-700 font-mono">
                          實際 {metrics.actualProgress}%
                        </span>
                        <span className="text-slate-400 font-mono text-3xs font-normal">
                          / 預定 {metrics.plannedProgress}%
                        </span>
                      </div>
                      <span
                        className={`font-mono text-2xs font-bold ${
                          metrics.variance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {metrics.variance >= 0
                          ? `+${metrics.variance}% (超前)`
                          : `${metrics.variance}% (落後)`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${metrics.plannedProgress}%` }}
                        className="absolute top-0 bottom-0 bg-blue-300 rounded-full"
                      />
                      <div
                        style={{
                          width: `${metrics.actualProgress}%`,
                          backgroundColor:
                            metrics.actualProgress >= 100
                              ? '#10b981'
                              : isBehind
                              ? '#ef4444'
                              : '#2563eb',
                        }}
                        className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
                      />
                    </div>

                    {/* Milestone & Sub-projects counts */}
                    <div className="flex items-center justify-between text-3xs font-mono text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Flag className="w-3 h-3 text-amber-500" />
                        管制節點: {metrics.milestoneCompleted}/{metrics.milestoneTotal}
                      </span>
                      <span>{proj.phases.length} 分項工程 · {proj.tasks.length} 工項</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectProject(proj.id, 'milestones')}
                    className="px-2.5 py-1 text-2xs font-medium text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-md border border-slate-200 transition-colors"
                  >
                    管制節點 ({metrics.milestoneTotal})
                  </button>

                  <button
                    onClick={() => onSelectProject(proj.id, 'gantt')}
                    className="flex items-center gap-1 px-3 py-1 text-2xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
                  >
                    <span>進入甘特圖</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Cross-Project Milestone Radar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              跨工程即將到期之重大管制節點雷達 ({upcomingCrossMilestones.length})
            </h3>
          </div>
          <span className="text-2xs text-slate-400">依目標日期排列</span>
        </div>

        {upcomingCrossMilestones.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            目前所有工程的管制節點皆已完成或無待辦事項。
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs font-mono">
            {upcomingCrossMilestones.slice(0, 5).map(({ project: p, task, days, status }) => (
              <div
                key={`${p.id}-${task.id}`}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold shrink-0">
                    {p.code}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 font-sans mr-2">
                      {task.name}
                    </span>
                    <span className="text-3xs text-slate-400 font-sans">
                      ({p.name})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-slate-500">{task.startDate}</span>
                  {days < 0 ? (
                    <span className="text-red-600 font-bold text-2xs bg-red-50 px-2 py-0.5 rounded">
                      逾期 {Math.abs(days)} 天
                    </span>
                  ) : days === 0 ? (
                    <span className="text-amber-600 font-bold text-2xs bg-amber-50 px-2 py-0.5 rounded">
                      今天到期
                    </span>
                  ) : (
                    <span className="text-blue-600 font-semibold text-2xs bg-blue-50 px-2 py-0.5 rounded">
                      尚餘 {days} 天
                    </span>
                  )}
                  <button
                    onClick={() => onSelectProject(p.id, 'milestones')}
                    className="text-2xs text-blue-600 hover:underline font-sans"
                  >
                    查核
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
