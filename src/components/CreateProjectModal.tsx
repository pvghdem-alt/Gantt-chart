import React, { useState } from 'react';
import { Project } from '../types/project';
import {
  BUILDING_CONSTRUCTION_PROJECT,
  INTERIOR_DECORATION_PROJECT,
  CIVIL_BRIDGE_PROJECT,
} from '../data/presetProjects';
import { X, Building2, Plus, Sparkles, FolderPlus } from 'lucide-react';
import { TODAY_STR, addDays } from '../utils/dateUtils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [templateType, setTemplateType] = useState<'building' | 'interior' | 'civil' | 'blank'>('building');
  const [name, setName] = useState('新竹AI科技研發中心新建工程');
  const [code, setCode] = useState('HC-2026-AI01');
  const [client, setClient] = useState('新竹科學園區管理局 / 聯發半導體');
  const [contractor, setContractor] = useState('大陸工程股份有限公司');
  const [projectManager, setProjectManager] = useState('林國雄 主任技師');
  const [startDate, setStartDate] = useState(TODAY_STR);
  const [targetEndDate, setTargetEndDate] = useState(addDays(TODAY_STR, 180));
  const [totalBudget, setTotalBudget] = useState(55000);
  const [description, setDescription] = useState('高科技廠房與辦公研發大樓，要求嚴格工安查核與潔淨室管制節點。');

  if (!isOpen) return null;

  const handleTemplateSelect = (type: typeof templateType) => {
    setTemplateType(type);
    if (type === 'building') {
      setName('台中七期頂級商業辦公大樓新建工程');
      setCode('TC-2026-CBD02');
      setTotalBudget(48500);
    } else if (type === 'interior') {
      setName('內湖科學園區企業總部智能裝修工程');
      setCode('INT-2026-NH');
      setTotalBudget(4200);
    } else if (type === 'civil') {
      setName('國道延伸高架段橋梁與箱涵土木工程');
      setCode('CIV-2026-HWY');
      setTotalBudget(72000);
    } else {
      setName('自訂全新工程專案');
      setCode('PRJ-2026-001');
      setTotalBudget(10000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let baseProject: Project;
    if (templateType === 'building') {
      baseProject = JSON.parse(JSON.stringify(BUILDING_CONSTRUCTION_PROJECT));
    } else if (templateType === 'interior') {
      baseProject = JSON.parse(JSON.stringify(INTERIOR_DECORATION_PROJECT));
    } else if (templateType === 'civil') {
      baseProject = JSON.parse(JSON.stringify(CIVIL_BRIDGE_PROJECT));
    } else {
      // Blank project with default phases
      baseProject = {
        id: `proj-${Date.now()}`,
        name: name.trim(),
        code: code.trim() || 'NEW-01',
        client: client.trim(),
        contractor: contractor.trim(),
        projectManager: projectManager.trim(),
        startDate,
        targetEndDate,
        totalBudget: Number(totalBudget) || 0,
        description: description.trim(),
        status: 'planning',
        phases: [
          { id: `ph-1`, name: '1.0 前置準備與假設工程', code: 'PRE', color: '#64748b', order: 1 },
          { id: `ph-2`, name: '2.0 主體結構與施工工法', code: 'STR', color: '#2563eb', order: 2 },
          { id: `ph-3`, name: '3.0 機電水電與設施安裝', code: 'MEP', color: '#0d9488', order: 3 },
          { id: `ph-4`, name: '4.0 驗收點交與測試試車', code: 'ACC', color: '#e11d48', order: 4 },
        ],
        tasks: [
          {
            id: `t-${Date.now()}-1`,
            phaseId: 'ph-1',
            wbs: '1.1',
            name: '工址測量放樣與開工備查 [管制節點]',
            startDate,
            endDate: addDays(startDate, 10),
            duration: 11,
            progress: 0,
            isMilestone: true,
            milestoneType: 'permit',
            milestoneCriteria: '法定主管機關開工備查核准',
            predecessors: [],
            assignee: contractor || '總承造商',
            weight: 20,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    }

    const newProject: Project = {
      ...baseProject,
      id: `proj-${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      client: client.trim(),
      contractor: contractor.trim(),
      projectManager: projectManager.trim(),
      startDate,
      targetEndDate,
      totalBudget: Number(totalBudget) || 0,
      description: description.trim(),
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">建立新工程專案</h2>
              <p className="text-xs text-slate-500">
                可選擇標準營造工程範本快速建立，或建立空白工程架構。
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Template Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              選擇起始範本架構
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateSelect('building')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  templateType === 'building'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-2xs font-semibold">建築大樓新建</div>
                <div className="text-3xs text-slate-400 font-normal mt-0.5">SRC 15F/B3F</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSelect('interior')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  templateType === 'interior'
                    ? 'border-purple-600 bg-purple-50/60 text-purple-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-2xs font-semibold">精品室內裝修</div>
                <div className="text-3xs text-slate-400 font-normal mt-0.5">500坪科技商辦</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSelect('civil')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  templateType === 'civil'
                    ? 'border-amber-600 bg-amber-50/60 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-2xs font-semibold">道路橋梁土木</div>
                <div className="text-3xs text-slate-400 font-normal mt-0.5">180M 景觀大橋</div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSelect('blank')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  templateType === 'blank'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-2xs font-semibold">空白自訂專案</div>
                <div className="text-3xs text-slate-400 font-normal mt-0.5">從零自設分項</div>
              </button>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              工程專案名稱 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 台中科技園區三期廠房新建工程"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                工程代號 / 標案編號
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="例如: PRJ-2026-X01"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                合約總造價 (萬元)
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                業主 / 委託單位
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                承造總包商
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                預定開工日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-md bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                預定竣工日
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-md bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                工地專任負責人
              </label>
              <input
                type="text"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-md bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              工程備註說明
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              建立工程專案
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
