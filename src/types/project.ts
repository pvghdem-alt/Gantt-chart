export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export type MilestoneType = 'contract' | 'permit' | 'inspection' | 'payment' | 'completion';

export interface PredecessorRelation {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start is standard
  lagDays?: number;
}

export interface Task {
  id: string;
  phaseId: string;
  wbs: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  duration: number;  // Working days or calendar days
  progress: number;  // Actual Progress 0-100
  plannedProgress?: number; // Calculated planned progress based on today
  isMilestone?: boolean;
  milestoneType?: MilestoneType;
  milestoneCriteria?: string; // 查驗標準 / 檢驗條件
  isCriticalPath?: boolean;
  predecessors: string[]; // List of task IDs that must finish before this starts
  assignee: string;      // 負責單位 / 協力廠商
  location?: string;      // 工區 / 樓層
  weight: number;        // 進度權重 % (全案加總為 100)
  status?: TaskStatus;   // 動態計算或快取之狀態
  budgetCost?: number;   // 預算金額 (NTD / 萬元)
  actualCost?: number;   // 累計支出
  notes?: string;        // 備註 / 施工安全查驗點
  completedDate?: string; // 實際完成日
}

export interface Phase {
  id: string;
  name: string;
  code: string;
  color: string;
  order: number;
}

export interface CrewCountEntry {
  trade: string;       // 工班 / 工種名稱
  workers: number;     // 當日進場人數
  taskId?: string;     // 對應工項 ID (選填)
  notes?: string;      // 施工區位 / 作業備註
}

export interface DailyWorkforceLog {
  id: string;          // e.g., wf-2026-11-16
  date: string;        // YYYY-MM-DD
  weather?: '晴' | '陰' | '雨' | '其他';
  entries: CrewCountEntry[];
  totalWorkers: number;
  safetyNotes?: string;
  updatedAt: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'delayed' | 'completed';

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;          // 業主 / 委託單位
  contractor: string;      // 承造商 / 總承包單位
  projectManager: string;  // 工地主任 / 專案經理
  startDate: string;       // 工程開工日
  targetEndDate: string;   // 預定竣工日
  totalBudget: number;     // 總合約造價 (萬元)
  description: string;
  phases: Phase[];
  tasks: Task[];
  workforceLogs?: DailyWorkforceLog[];
  status?: ProjectStatus;
  updatedAt: string;
}

export type TimelineZoom = 'day' | 'week' | 'month';

export type ActiveView = 'portfolio' | 'gantt' | 'milestones' | 'table' | 'analytics' | 'workforce' | 'tutorial';
