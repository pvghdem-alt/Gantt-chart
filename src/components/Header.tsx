import React, { useState } from 'react';
import { Project, ActiveView } from '../types/project';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  Plus, 
  SlidersHorizontal,
  Download,
  Upload,
  Printer,
  ChevronDown,
  FolderKanban,
  Check,
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onAddTask: () => void;
  onOpenCreateProject: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  onPrint: () => void;
  isCloudSynced?: boolean;
  onRestoreUserData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  activeView,
  onViewChange,
  onAddTask,
  onOpenCreateProject,
  onOpenSettings,
  onExport,
  onImport,
  onPrint,
  isCloudSynced = true,
  onRestoreUserData,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center justify-between gap-6 px-6 py-3 max-w-[1720px] mx-auto">
        {/* Zone 1: Brand title & Multi-Project Switcher Dropdown */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-xs">
            <span className="tracking-tighter">PM</span>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="max-w-[200px] sm:max-w-[280px]">
                <div className="text-2xs font-mono text-slate-400 leading-none">
                  工程專案 · {projects.length} 個管制中
                </div>
                <div className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5">
                  {activeProject.name}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isProjectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-3 py-1.5 text-3xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>切換管制工程</span>
                    <button
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onViewChange('portfolio');
                      }}
                      className="text-blue-600 hover:underline capitalize"
                    >
                      所有工程總覽
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                    {projects.map((p) => {
                      const isSel = p.id === activeProject.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProject(p.id);
                            setIsProjectDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            isSel ? 'bg-blue-50/60 font-semibold' : ''
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="text-2xs font-mono text-slate-500">
                              {p.code}
                            </div>
                            <div className="truncate text-slate-900">
                              {p.name}
                            </div>
                          </div>
                          {isSel && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 px-2 border-t border-slate-100 space-y-1">
                    <button
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onOpenCreateProject();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-2xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>建立新工程專案</span>
                    </button>

                    {onRestoreUserData && (
                      <button
                        onClick={() => {
                          setIsProjectDropdownOpen(false);
                          if (confirm('確定要還原工程資料嗎？將載入招標決標、油漆工程、天花板拆除等10項工項。')) {
                            onRestoreUserData();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1 text-3xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <span>還原原版工程資料 (10項工項)</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Zone 2: 5 clean single-line nav links */}
        <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
          <button
            onClick={() => onViewChange('portfolio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeView === 'portfolio'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-slate-700" />
            <span>工程總覽</span>
          </button>

          <button
            onClick={() => onViewChange('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeView === 'gantt'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-700" />
            <span>甘特圖排程</span>
          </button>

          <button
            onClick={() => onViewChange('milestones')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeView === 'milestones'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>管制節點中心</span>
          </button>

          <button
            onClick={() => onViewChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeView === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>工項總表 (WBS)</span>
          </button>

          <button
            onClick={() => onViewChange('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeView === 'analytics'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>進度與S曲線</span>
          </button>
        </nav>

        {/* Zone 3: Utility buttons & 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Firebase Cloud Sync status */}
          <div
            title="Firebase Firestore 雲端資料庫已連線，資料即時同步"
            className="hidden lg:flex items-center gap-1.5 text-2xs text-slate-500 font-mono pr-2 border-r border-slate-200"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span>{isCloudSynced ? 'Firebase 雲端已同步' : '同步中...'}</span>
          </div>

          <button
            onClick={onPrint}
            title="列印 / 匯出 PDF"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExport}
            title="匯出工程資料 (JSON)"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onImport}
            title="匯入工程檔案"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenSettings}
            title="本工程基本設定與分項管理"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>工程設定</span>
          </button>

          <button
            onClick={onAddTask}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增工項</span>
          </button>
        </div>
      </div>
    </header>
  );
};
