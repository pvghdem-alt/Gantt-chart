/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, Task, ActiveView, Phase } from './types/project';
import { INITIAL_PROJECTS, BUILDING_CONSTRUCTION_PROJECT } from './data/presetProjects';
import { Header } from './components/Header';
import { GanttChart } from './components/GanttChart';
import { MilestoneControlView } from './components/MilestoneControlView';
import { TaskTableView } from './components/TaskTableView';
import { ProgressDashboardView } from './components/ProgressDashboardView';
import { PortfolioOverviewView } from './components/PortfolioOverviewView';
import { TaskEditModal } from './components/TaskEditModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import {
  calculateProjectMetrics,
  determineTaskStatus,
  TODAY_STR,
  diffDays,
  autoScheduleDependentTasks,
  renumberProjectWBS,
} from './utils/dateUtils';
import {
  subscribeProjects,
  saveProject,
  deleteProjectDoc,
  seedInitialProjects,
} from './services/projectService';
import { testConnection } from './lib/firebase';
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Flag,
  ArrowRight,
  HardHat,
  Clock,
  Printer,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';

const STORAGE_PROJECTS_KEY = 'engineering_projects_portfolio_v2';
const STORAGE_ACTIVE_ID_KEY = 'engineering_active_project_id_v2';

const LEGACY_STORAGE_KEYS = [
  'engineering_projects_portfolio_v2',
  'engineering_projects_portfolio',
  'engineering_projects',
  'projects',
  'engineering_project_data_v1',
  'engineering_project_data',
  'construction_projects',
  'current_project',
];

function loadSavedProjects(): Project[] {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If parsed has the user's renovation tasks, load them!
        const hasRenovationTasks = parsed.some((p: Project) =>
          p.tasks?.some((t: Task) => t.name?.includes('招標決標') || t.name?.includes('天花板拆除') || t.name?.includes('油漆工程'))
        );
        if (hasRenovationTasks) {
          return parsed.map((p: Project) => {
            const { updatedTasks } = autoScheduleDependentTasks(p.tasks || []);
            return { ...p, tasks: updatedTasks };
          });
        }

        // If proj-01-building exists but had the older generic skyscraper tasks,
        // restore it to the user's renovation tasks
        const upgraded = parsed.map((p: Project) => {
          if (p.id === 'proj-01-building') {
            const isOldSkyscraper = p.tasks?.some((t: Task) => t.name?.includes('地質鑽探'));
            if (isOldSkyscraper) {
              return BUILDING_CONSTRUCTION_PROJECT;
            }
          }
          const { updatedTasks } = autoScheduleDependentTasks(p.tasks || []);
          return { ...p, tasks: updatedTasks };
        });
        return upgraded;
      } else if (parsed && typeof parsed === 'object' && parsed.tasks) {
        const isRenovation = parsed.tasks?.some((t: Task) => t.name?.includes('招標決標') || t.name?.includes('天花板拆除'));
        const singleProj = isRenovation ? parsed : BUILDING_CONSTRUCTION_PROJECT;
        return [singleProj, ...INITIAL_PROJECTS.filter((p) => p.id !== singleProj.id)];
      }
    } catch (e) {
      // Continue next key
    }
  }

  return INITIAL_PROJECTS.map((p) => {
    const { updatedTasks } = autoScheduleDependentTasks(p.tasks || []);
    return { ...p, tasks: updatedTasks };
  });
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    return loadSavedProjects();
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (savedId) return savedId;
    } catch (e) {
      // ignore
    }
    return 'proj-01-building';
  });

  const [activeView, setActiveView] = useState<ActiveView>('gantt');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | undefined>();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firestore Real-time Subscription and Auto-Seed
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) setIsCloudSynced(true);
    });

    // Seed initial projects if Firestore is completely empty
    seedInitialProjects(INITIAL_PROJECTS);

    const unsubscribe = subscribeProjects(
      (remoteProjects) => {
        if (remoteProjects && remoteProjects.length > 0) {
          const cleanedRemote = remoteProjects.map((p) => {
            if (p.id === 'proj-01-building') {
              const isOldSkyscraper = p.tasks?.some((t: Task) => t.name?.includes('地質鑽探'));
              if (isOldSkyscraper) {
                // Update Firestore doc with the user's renovation project
                saveProject(BUILDING_CONSTRUCTION_PROJECT);
                return BUILDING_CONSTRUCTION_PROJECT;
              }
            }
            const { updatedTasks } = autoScheduleDependentTasks(p.tasks || []);
            return { ...p, tasks: updatedTasks };
          });

          setProjects(cleanedRemote);
          setIsCloudSynced(true);
          // If active project is not in remote list, pick first
          setActiveProjectId((currId) => {
            const hasCurr = cleanedRemote.some((p) => p.id === currId);
            return hasCurr ? currId : cleanedRemote[0].id;
          });
        }
      },
      (err) => {
        console.warn('Firestore subscription fallback to local cache:', err);
        setIsCloudSynced(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Active Project instance
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || BUILDING_CONSTRUCTION_PROJECT;

  // Persist projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeProjectId);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [projects, activeProjectId]);

  // One-click restore user's original renovation project data
  const handleRestoreUserProject = async () => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === 'proj-01-building');
      const updated = exists
        ? prev.map((p) => (p.id === 'proj-01-building' ? BUILDING_CONSTRUCTION_PROJECT : p))
        : [BUILDING_CONSTRUCTION_PROJECT, ...prev];
      return updated;
    });
    setActiveProjectId('proj-01-building');
    try {
      await saveProject(BUILDING_CONSTRUCTION_PROJECT);
    } catch (e) {
      console.error('Failed to sync restored project to Firestore:', e);
    }
    alert('已成功恢復您的工程資料與所有工項排程！');
  };

  // Project metrics for the active project
  const metrics = calculateProjectMetrics(activeProject);

  // Milestone countdown for active project
  const nextMilestone = activeProject.tasks
    .filter((t) => t.isMilestone && t.progress < 100 && t.startDate >= TODAY_STR)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const daysToNextMilestone = nextMilestone
    ? diffDays(TODAY_STR, nextMilestone.startDate)
    : null;

  // Multi-Project Handlers
  const handleSelectProject = (projectId: string, targetView?: ActiveView) => {
    setActiveProjectId(projectId);
    if (targetView) {
      setActiveView(targetView);
    }
  };

  const handleCreateProject = async (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActiveView('gantt');
    try {
      await saveProject(newProject);
    } catch (e) {
      console.error('Failed to save new project to Firestore:', e);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    const source = projects.find((p) => p.id === projectId);
    if (!source) return;

    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(source)),
      id: `proj-${Date.now()}`,
      name: `${source.name} (複製)`,
      code: `${source.code}-COPY`,
      updatedAt: new Date().toISOString(),
    };

    setProjects((prev) => [duplicated, ...prev]);
    setActiveProjectId(duplicated.id);
    try {
      await saveProject(duplicated);
    } catch (e) {
      console.error('Failed to save duplicated project to Firestore:', e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      alert('系統中至少需保留一個工程專案！');
      return;
    }
    const target = projects.find((p) => p.id === projectId);
    if (!confirm(`確定要刪除工程專案「${target?.name}」及其所有排程資料嗎？`)) {
      return;
    }

    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (activeProjectId === projectId) {
      setActiveProjectId(remaining[0].id);
    }
    try {
      await deleteProjectDoc(projectId);
    } catch (e) {
      console.error('Failed to delete project from Firestore:', e);
    }
  };

  const handleUpdateActiveProject = async (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      await saveProject(updated);
    } catch (e) {
      console.error('Failed to update project in Firestore:', e);
    }
  };

  // Handlers for task mutations inside active project
  const handleOpenAddTask = (phaseId?: string) => {
    setEditingTask(null);
    setDefaultPhaseId(phaseId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultPhaseId(task.phaseId);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (savedTask: Task) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        const exists = proj.tasks.some((t) => t.id === savedTask.id);
        const intermediate = exists
          ? proj.tasks.map((t) => (t.id === savedTask.id ? savedTask : t))
          : [...proj.tasks, savedTask];
        // Automatically cascade forward-pass schedule for all dependent tasks
        const { updatedTasks } = autoScheduleDependentTasks(intermediate);
        updatedProject = {
          ...proj,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to save task to Firestore:', e);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('確定要刪除此工項作業嗎？若有其他工項相依於此項，相依關係將被清除。')) {
      return;
    }
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        updatedProject = {
          ...proj,
          tasks: proj.tasks
            .filter((t) => t.id !== taskId)
            .map((t) => ({
              ...t,
              predecessors: t.predecessors?.filter((pId) => pId !== taskId) || [],
            })),
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to delete task in Firestore:', e);
      }
    }
  };

  const handleUpdateTaskDates = async (taskId: string, startDate: string, endDate: string) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        const intermediate = proj.tasks.map((t) => {
          if (t.id === taskId) {
            const duration = diffDays(startDate, endDate) + 1;
            return {
              ...t,
              startDate,
              endDate,
              duration: Math.max(1, duration),
            };
          }
          return t;
        });
        const { updatedTasks } = autoScheduleDependentTasks(intermediate);
        updatedProject = {
          ...proj,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to update task dates in Firestore:', e);
      }
    }
  };

  const handleUpdateProgress = async (taskId: string, newProgress: number) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        updatedProject = {
          ...proj,
          tasks: proj.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  progress: newProgress,
                  completedDate: newProgress === 100 ? TODAY_STR : undefined,
                }
              : t
          ),
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to update progress in Firestore:', e);
      }
    }
  };

  const handleReorderTasks = async (newTasks: Task[]) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        updatedProject = {
          ...proj,
          tasks: newTasks,
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to update reordered tasks in Firestore:', e);
      }
    }
  };

  const handleUpdatePhases = async (newPhases: Phase[]) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        updatedProject = {
          ...proj,
          phases: newPhases,
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to update phases in Firestore:', e);
      }
    }
  };

  const handleDeletePhase = async (
    phaseId: string,
    options?: { deleteTasks?: boolean; moveToPhaseId?: string }
  ) => {
    let updatedProject: Project | null = null;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        if (proj.phases.length <= 1) {
          alert('工程專案至少需保留一個分項工程！');
          return proj;
        }

        const remainingPhases = proj.phases.filter((p) => p.id !== phaseId);
        let updatedTasks = [...proj.tasks];

        if (options?.deleteTasks) {
          const deletedTaskIds = new Set(
            proj.tasks.filter((t) => t.phaseId === phaseId).map((t) => t.id)
          );
          updatedTasks = proj.tasks
            .filter((t) => t.phaseId !== phaseId)
            .map((t) => ({
              ...t,
              predecessors: t.predecessors?.filter((id) => !deletedTaskIds.has(id)) || [],
            }));
        } else if (options?.moveToPhaseId) {
          updatedTasks = proj.tasks.map((t) =>
            t.phaseId === phaseId ? { ...t, phaseId: options.moveToPhaseId! } : t
          );
        } else {
          // If no tasks in this phase, just keep existing tasks
          updatedTasks = proj.tasks.filter((t) => t.phaseId !== phaseId);
        }

        // Re-number remaining phases sequentially: 1, 2, 3...
        const reorderedPhases = remainingPhases.map((p, idx) => ({
          ...p,
          order: idx + 1,
        }));
        // Re-number tasks WBS according to new phase order
        const renumberedTasks = renumberProjectWBS(reorderedPhases, updatedTasks);

        updatedProject = {
          ...proj,
          phases: reorderedPhases,
          tasks: renumberedTasks,
          updatedAt: new Date().toISOString(),
        };
        return updatedProject;
      })
    );

    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error('Failed to delete phase in Firestore:', e);
      }
    }
  };

  const handleToggleMilestoneComplete = (taskId: string, currentProgress: number) => {
    const newProgress = currentProgress >= 100 ? 0 : 100;
    handleUpdateProgress(taskId, newProgress);
  };

  // Export JSON (All projects or active project)
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `工程多專案管制庫_${TODAY_STR}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          setProjects(parsed);
          setActiveProjectId(parsed[0].id);
          alert(`成功匯入 ${parsed.length} 個工程專案！`);
        } else if (parsed.name && Array.isArray(parsed.phases)) {
          // single project format imported
          const newId = `proj-${Date.now()}`;
          const importedProj: Project = { ...parsed, id: newId };
          setProjects((prev) => [importedProj, ...prev]);
          setActiveProjectId(newId);
          alert(`成功匯入工程專案「${parsed.name}」！`);
        } else {
          alert('檔案格式不相符，無法辨識為合法的工程專案 JSON 檔案。');
        }
      } catch (err) {
        alert('匯入失敗：請確認所選檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* 1. Global Navigation Header */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        activeView={activeView}
        onViewChange={setActiveView}
        onAddTask={() => handleOpenAddTask()}
        onOpenCreateProject={() => setIsCreateProjectModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onExport={handleExportJson}
        onImport={handleTriggerImport}
        onPrint={handlePrint}
        isCloudSynced={isCloudSynced}
        onRestoreUserData={handleRestoreUserProject}
      />

      {/* 2. Sub-Header Active Project Banner (Hidden on Portfolio View) */}
      {activeView !== 'portfolio' && (
        <div className="bg-white border-b border-slate-200 px-6 py-3 no-print">
          <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Project Title & Meta details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveView('portfolio')}
                  title="返回所有工程總覽"
                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <FolderKanban className="w-4 h-4 text-blue-600" />
                </button>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {activeProject.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-semibold border border-blue-200">
                  {activeProject.code}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>業主: {activeProject.client}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <HardHat className="w-3.5 h-3.5 text-slate-400" />
                  <span>承造: {activeProject.contractor}</span>
                </span>
                <span>·</span>
                <span className="font-mono">
                  期程: {activeProject.startDate} 至 {activeProject.targetEndDate}
                </span>
              </div>
            </div>

            {/* Quick Schedule KPI Ticker */}
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200/80 text-xs">
              {/* Progress */}
              <div className="px-3 border-r border-slate-200">
                <div className="text-3xs text-slate-400">累計實際進度</div>
                <div className="font-mono font-bold text-sm text-blue-600">
                  {metrics.actualProgress}%
                  <span className="text-3xs font-normal text-slate-400 ml-1">
                    (預定 {metrics.plannedProgress}%)
                  </span>
                </div>
              </div>

              {/* Variance */}
              <div className="px-3 border-r border-slate-200">
                <div className="text-3xs text-slate-400">進度偏差</div>
                <div
                  className={`font-mono font-bold text-sm ${
                    metrics.variance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {metrics.variance >= 0 ? `+${metrics.variance}%` : `${metrics.variance}%`}
                </div>
              </div>

              {/* Milestones count */}
              <div className="px-3 border-r border-slate-200">
                <div className="text-3xs text-slate-400">管制節點達成</div>
                <div className="font-mono font-bold text-sm text-amber-600">
                  {metrics.milestoneCompleted} / {metrics.milestoneTotal}
                </div>
              </div>

              {/* Next Milestone Countdown */}
              <div className="px-2">
                <div className="text-3xs text-slate-400">下個管制節點</div>
                <div className="font-mono font-bold text-sm text-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {daysToNextMilestone !== null ? (
                    <span>
                      {daysToNextMilestone} 天後
                      <span className="text-3xs font-normal text-slate-400 ml-1 truncate max-w-[90px] inline-block align-bottom">
                        ({nextMilestone?.name})
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">全部達成</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Work Area */}
      <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto flex flex-col">
        {/* Portfolio Multi-Project Master View */}
        {activeView === 'portfolio' && (
          <PortfolioOverviewView
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={() => setIsCreateProjectModalOpen(true)}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {/* Gantt View for active project */}
        {activeView === 'gantt' && (
          <div className="flex-1 min-h-[640px] flex flex-col">
            <GanttChart
              project={activeProject}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTaskToPhase={(phaseId) => handleOpenAddTask(phaseId)}
              onUpdateTaskDates={handleUpdateTaskDates}
              onReorderTasks={handleReorderTasks}
              onUpdatePhases={handleUpdatePhases}
              onDeletePhase={handleDeletePhase}
            />
          </div>
        )}

        {/* Milestones Hub for active project */}
        {activeView === 'milestones' && (
          <MilestoneControlView
            project={activeProject}
            onEditTask={handleOpenEditTask}
            onAddTask={() => handleOpenAddTask()}
            onToggleComplete={handleToggleMilestoneComplete}
          />
        )}

        {/* WBS Tasks Table for active project */}
        {activeView === 'table' && (
          <TaskTableView
            project={activeProject}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={() => handleOpenAddTask()}
            onUpdateProgress={handleUpdateProgress}
            onReorderTasks={handleReorderTasks}
            onUpdatePhases={handleUpdatePhases}
            onDeletePhase={handleDeletePhase}
          />
        )}

        {/* Progress & S-Curve Analytics for active project */}
        {activeView === 'analytics' && (
          <ProgressDashboardView
            project={activeProject}
            onSelectView={setActiveView}
          />
        )}
      </main>

      {/* 4. Modals */}
      <TaskEditModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        project={activeProject}
        initialTask={editingTask}
        defaultPhaseId={defaultPhaseId}
      />

      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        project={activeProject}
        onUpdateProject={handleUpdateActiveProject}
        onLoadTemplate={handleUpdateActiveProject}
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
