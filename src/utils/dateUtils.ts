import { Task, Project, TimelineZoom, TaskStatus } from '../types/project';

export const TODAY_STR = new Date().toISOString().split('T')[0];

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function diffDays(startStr: string, endStr: string): number {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateDuration(startDate: string, endDate: string): number {
  const days = diffDays(startDate, endDate);
  return Math.max(1, days + 1); // Inclusive days
}

export function getPlannedProgress(startDate: string, endDate: string, todayStr: string = TODAY_STR): number {
  if (todayStr < startDate) return 0;
  if (todayStr >= endDate) return 100;
  const total = diffDays(startDate, endDate);
  if (total <= 0) return 100;
  const elapsed = diffDays(startDate, todayStr);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function determineTaskStatus(task: Task, todayStr: string = TODAY_STR): TaskStatus {
  if (task.progress >= 100) return 'completed';
  const planned = getPlannedProgress(task.startDate, task.endDate, todayStr);
  // If actual progress falls behind planned progress by more than 10%, or past deadline and not completed
  if (todayStr > task.endDate && task.progress < 100) {
    return 'delayed';
  }
  if (planned - task.progress >= 15 && planned > 0) {
    return 'delayed';
  }
  if (task.progress > 0 || (todayStr >= task.startDate && task.progress >= 0)) {
    return 'in_progress';
  }
  return 'not_started';
}

export interface TimelineHeader {
  key: string;
  label: string;
  subLabel: string;
  startDate: string;
  endDate: string;
  isToday: boolean;
  isWeekend?: boolean;
}

export function generateTimelineRange(
  tasks: Task[],
  zoom: TimelineZoom,
  bufferDaysBefore = 7,
  bufferDaysAfter = 14
): {
  minDate: string;
  maxDate: string;
  headers: TimelineHeader[];
  totalDays: number;
  columnWidth: number;
} {
  if (tasks.length === 0) {
    const today = parseDate(TODAY_STR);
    const min = addDays(TODAY_STR, -7);
    const max = addDays(TODAY_STR, 60);
    return {
      minDate: min,
      maxDate: max,
      headers: [],
      totalDays: 67,
      columnWidth: 36,
    };
  }

  // Find earliest start and latest end
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const t of tasks) {
    const s = parseDate(t.startDate).getTime();
    const e = parseDate(t.endDate).getTime();
    if (s < minTime) minTime = s;
    if (e > maxTime) maxTime = e;
  }

  const rawMinDate = formatDate(new Date(minTime));
  const rawMaxDate = formatDate(new Date(maxTime));

  const minDate = addDays(rawMinDate, -bufferDaysBefore);
  const maxDate = addDays(rawMaxDate, bufferDaysAfter);
  const totalDays = calculateDuration(minDate, maxDate);

  const headers: TimelineHeader[] = [];
  let columnWidth = 36; // px per day in 'day' view

  if (zoom === 'day') {
    columnWidth = 36;
    let curr = parseDate(minDate);
    const end = parseDate(maxDate);

    while (curr <= end) {
      const dateStr = formatDate(curr);
      const dayOfWeek = curr.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateStr === TODAY_STR;
      
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      headers.push({
        key: dateStr,
        label: `${curr.getMonth() + 1}/${curr.getDate()}`,
        subLabel: dayNames[dayOfWeek],
        startDate: dateStr,
        endDate: dateStr,
        isToday,
        isWeekend,
      });

      curr.setDate(curr.getDate() + 1);
    }
  } else if (zoom === 'week') {
    columnWidth = 64; // px per week
    let curr = parseDate(minDate);
    // Align to Monday
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    curr = new Date(curr.setDate(diff));

    const end = parseDate(maxDate);
    let weekCount = 1;

    while (curr <= end) {
      const weekStartStr = formatDate(curr);
      const weekEndDate = new Date(curr);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEndStr = formatDate(weekEndDate);
      const isToday = TODAY_STR >= weekStartStr && TODAY_STR <= weekEndStr;

      headers.push({
        key: weekStartStr,
        label: `W${weekCount}`,
        subLabel: `${curr.getMonth() + 1}/${curr.getDate()}`,
        startDate: weekStartStr,
        endDate: weekEndStr,
        isToday,
      });

      curr.setDate(curr.getDate() + 7);
      weekCount++;
    }
  } else {
    // Month zoom
    columnWidth = 110; // px per month
    let curr = new Date(parseDate(minDate).getFullYear(), parseDate(minDate).getMonth(), 1);
    const end = parseDate(maxDate);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = curr.getMonth();
      const monthStartStr = formatDate(new Date(y, m, 1));
      const nextMonth = new Date(y, m + 1, 0);
      const monthEndStr = formatDate(nextMonth);
      const isToday = TODAY_STR >= monthStartStr && TODAY_STR <= monthEndStr;

      headers.push({
        key: monthStartStr,
        label: `${y}年`,
        subLabel: `${m + 1}月`,
        startDate: monthStartStr,
        endDate: monthEndStr,
        isToday,
      });

      curr.setMonth(curr.getMonth() + 1);
    }
  }

  return {
    minDate,
    maxDate,
    headers,
    totalDays,
    columnWidth,
  };
}

// Convert date to X pixel offset
export function dateToPixel(
  dateStr: string,
  minDate: string,
  zoom: TimelineZoom,
  columnWidth: number
): number {
  const daysDiff = diffDays(minDate, dateStr);

  if (zoom === 'day') {
    return daysDiff * columnWidth;
  } else if (zoom === 'week') {
    // 7 days = columnWidth
    return (daysDiff / 7) * columnWidth;
  } else {
    // ~30.4 days per month
    return (daysDiff / 30.4375) * columnWidth;
  }
}

// Compute Critical Path (Basic CPM)
export function calculateCriticalPath(tasks: Task[]): Set<string> {
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  // Find tasks that have zero successors or are at the end
  const successors = new Map<string, string[]>();
  tasks.forEach((t) => {
    t.predecessors?.forEach((predId) => {
      const list = successors.get(predId) || [];
      list.push(t.id);
      successors.set(predId, list);
    });
  });

  // Calculate longest path back
  // For standard construction, tasks with lowest slack or on the chain with max duration
  const critical = new Set<string>();

  // If a task is explicitly marked or if it's a critical milestone, add it
  tasks.forEach((t) => {
    if (t.isCriticalPath || (t.isMilestone && determineTaskStatus(t, TODAY_STR) === 'delayed')) {
      critical.add(t.id);
    }
  });

  // Also trace backward from longest end date
  let latestTask: Task | null = null;
  let maxEnd = -Infinity;
  tasks.forEach((t) => {
    const endVal = parseDate(t.endDate).getTime();
    if (endVal > maxEnd) {
      maxEnd = endVal;
      latestTask = t;
    }
  });

  if (latestTask) {
    let curr: Task | null = latestTask;
    const visited = new Set<string>();
    while (curr && !visited.has(curr.id)) {
      critical.add(curr.id);
      visited.add(curr.id);
      if (curr.predecessors && curr.predecessors.length > 0) {
        // pick predecessor with latest finish date
        let bestPred: Task | null = null;
        let bestEnd = -Infinity;
        for (const pId of curr.predecessors) {
          const p = taskMap.get(pId);
          if (p) {
            const pTime = parseDate(p.endDate).getTime();
            if (pTime > bestEnd) {
              bestEnd = pTime;
              bestPred = p;
            }
          }
        }
        curr = bestPred;
      } else {
        curr = null;
      }
    }
  }

  return critical;
}

// Compute Project Level Statistics
export function calculateProjectMetrics(project: Project) {
  const totalTasks = project.tasks.length;
  if (totalTasks === 0) {
    return {
      actualProgress: 0,
      plannedProgress: 0,
      variance: 0,
      completedCount: 0,
      inProgressCount: 0,
      delayedCount: 0,
      milestoneTotal: 0,
      milestoneCompleted: 0,
      budgetTotal: project.totalBudget || 0,
      actualCostTotal: 0,
    };
  }

  // Check weights sum
  const sumWeights = project.tasks.reduce((sum, t) => sum + (t.weight || 0), 0);
  const useWeights = sumWeights > 90 && sumWeights < 110;

  let weightedActual = 0;
  let weightedPlanned = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let delayedCount = 0;
  let milestoneTotal = 0;
  let milestoneCompleted = 0;
  let actualCostTotal = 0;

  project.tasks.forEach((task) => {
    const planned = getPlannedProgress(task.startDate, task.endDate, TODAY_STR);
    const weightFraction = useWeights ? task.weight / sumWeights : 1 / totalTasks;

    weightedActual += task.progress * weightFraction;
    weightedPlanned += planned * weightFraction;

    const status = determineTaskStatus(task, TODAY_STR);
    if (task.progress >= 100) completedCount++;
    else if (status === 'delayed') delayedCount++;
    else if (status === 'in_progress') inProgressCount++;

    if (task.isMilestone) {
      milestoneTotal++;
      if (task.progress >= 100) milestoneCompleted++;
    }

    if (task.actualCost) {
      actualCostTotal += task.actualCost;
    }
  });

  const actualProgress = Math.round(weightedActual * 10) / 10;
  const plannedProgress = Math.round(weightedPlanned * 10) / 10;
  const variance = Math.round((actualProgress - plannedProgress) * 10) / 10;

  return {
    actualProgress,
    plannedProgress,
    variance,
    completedCount,
    inProgressCount,
    delayedCount,
    milestoneTotal,
    milestoneCompleted,
    budgetTotal: project.totalBudget || 0,
    actualCostTotal,
  };
}

export function generateSCurveData(project: Project) {
  if (project.tasks.length === 0) return [];

  // Group by months or weeks
  const start = parseDate(project.startDate);
  const end = parseDate(project.targetEndDate);
  
  const intervals: { date: string; label: string; planned: number; actual: number }[] = [];
  const curr = new Date(start);
  const sumWeights = project.tasks.reduce((sum, t) => sum + (t.weight || 0), 0) || 100;

  while (curr <= end) {
    const dStr = formatDate(curr);
    
    // Calculate cumulative planned at this date
    let plannedAcc = 0;
    project.tasks.forEach((t) => {
      const p = getPlannedProgress(t.startDate, t.endDate, dStr);
      plannedAcc += p * (t.weight / sumWeights);
    });

    // Calculate actual up to today
    let actualAcc = 0;
    const isPastOrToday = dStr <= TODAY_STR;
    if (isPastOrToday) {
      project.tasks.forEach((t) => {
        // If task finished before this date, full progress
        if (t.endDate <= dStr) {
          actualAcc += t.progress * (t.weight / sumWeights);
        } else if (t.startDate <= dStr) {
          const ratio = diffDays(t.startDate, dStr) / calculateDuration(t.startDate, t.endDate);
          const interpolated = Math.min(t.progress, Math.max(0, t.progress * ratio));
          actualAcc += interpolated * (t.weight / sumWeights);
        }
      });
    }

    intervals.push({
      date: dStr,
      label: `${curr.getMonth() + 1}/${curr.getDate()}`,
      planned: Math.min(100, Math.round(plannedAcc)),
      actual: isPastOrToday ? Math.min(100, Math.round(actualAcc)) : null as any,
    });

    // Step by 14 days
    curr.setDate(curr.getDate() + 14);
  }

  return intervals;
}

// Automatically renumber all WBS codes based on Phase order and Task sequence
export function renumberProjectWBS(phases: Project['phases'], tasks: Task[]): Task[] {
  const phaseOrderMap = new Map<string, number>();
  phases.forEach((p, idx) => {
    phaseOrderMap.set(p.id, p.order || idx + 1);
  });

  const phaseTasksMap = new Map<string, Task[]>();
  phases.forEach((p) => phaseTasksMap.set(p.id, []));

  tasks.forEach((t) => {
    const list = phaseTasksMap.get(t.phaseId) || [];
    list.push(t);
    phaseTasksMap.set(t.phaseId, list);
  });

  const renumberedTasks: Task[] = [];
  phases.forEach((p) => {
    const list = phaseTasksMap.get(p.id) || [];
    const pNum = phaseOrderMap.get(p.id) || 1;
    list.forEach((t, idx) => {
      renumberedTasks.push({
        ...t,
        wbs: `${pNum}.${idx + 1}`,
      });
    });
  });

  // Keep any tasks with unknown phase
  tasks.forEach((t) => {
    if (!phaseOrderMap.has(t.phaseId)) {
      renumberedTasks.push(t);
    }
  });

  return renumberedTasks;
}

// Automatically adjust tasks so that dependent tasks start AFTER their predecessors finish (FS with 0 lag)
export function autoScheduleDependentTasks(tasks: Task[]): {
  updatedTasks: Task[];
  adjustedCount: number;
} {
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, { ...t }));

  let adjustedCount = 0;
  const maxIterations = Math.min(50, tasks.length + 5);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changedInThisPass = false;

    for (const [_, task] of taskMap.entries()) {
      if (!task.predecessors || task.predecessors.length === 0) continue;

      // Find latest end date among all predecessors
      let maxPredEnd = '';
      for (const predId of task.predecessors) {
        const pred = taskMap.get(predId);
        if (pred && pred.endDate) {
          if (!maxPredEnd || pred.endDate > maxPredEnd) {
            maxPredEnd = pred.endDate;
          }
        }
      }

      if (maxPredEnd) {
        // Must start at least on the day after predecessor finishes
        const minAllowedStart = addDays(maxPredEnd, 1);
        if (task.startDate < minAllowedStart) {
          const duration = Math.max(1, calculateDuration(task.startDate, task.endDate));
          const newStart = minAllowedStart;
          const newEnd = addDays(newStart, duration - 1);

          task.startDate = newStart;
          task.endDate = newEnd;
          task.duration = duration;

          changedInThisPass = true;
          adjustedCount++;
        }
      }
    }

    if (!changedInThisPass) break;
  }

  // Preserve original task order in array
  const updatedTasks = tasks.map((t) => taskMap.get(t.id) || t);
  return { updatedTasks, adjustedCount };
}

// Automatically calculate each task's weight (%) proportionally from its budgetCost over total tasks budget
export function recalculateWeightsByBudget(tasks: Task[]): {
  updatedTasks: Task[];
  totalBudget: number;
} {
  const costs = tasks.map((t) => Math.max(0, Number(t.budgetCost) || 0));
  const totalBudget = costs.reduce((sum, c) => sum + c, 0);

  if (totalBudget <= 0) {
    return { updatedTasks: tasks, totalBudget: 0 };
  }

  const weights = costs.map((cost) => {
    if (cost <= 0) return 0;
    return Math.round(((cost / totalBudget) * 100) * 10) / 10;
  });

  // Adjust rounding discrepancy on the largest-budget task so total equals 100.0%
  const sumWeights = Math.round(weights.reduce((acc, w) => acc + w, 0) * 10) / 10;
  const diff = Math.round((100 - sumWeights) * 10) / 10;

  if (diff !== 0) {
    let maxIdx = -1;
    let maxCost = -1;
    costs.forEach((c, idx) => {
      if (c > maxCost) {
        maxCost = c;
        maxIdx = idx;
      }
    });
    if (maxIdx >= 0) {
      weights[maxIdx] = Math.max(0, Math.round((weights[maxIdx] + diff) * 10) / 10);
    }
  }

  const updatedTasks = tasks.map((t, idx) => ({
    ...t,
    weight: weights[idx],
  }));

  return { updatedTasks, totalBudget };
}

