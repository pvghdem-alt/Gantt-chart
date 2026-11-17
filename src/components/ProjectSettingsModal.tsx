import React, { useState } from 'react';
import { Project, Phase } from '../types/project';
import { BUILDING_CONSTRUCTION_PROJECT, INTERIOR_DECORATION_PROJECT } from '../data/presetProjects';
import { X, Layers, Sliders, Plus, Trash2, FolderSync, Building, Sparkles } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onLoadTemplate: (template: Project) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onLoadTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'phases' | 'templates'>('info');

  const [meta, setMeta] = useState({
    name: project.name,
    code: project.code,
    client: project.client,
    contractor: project.contractor,
    projectManager: project.projectManager,
    totalBudget: project.totalBudget,
    description: project.description,
  });

  const [phases, setPhases] = useState<Phase[]>(project.phases);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseCode, setNewPhaseCode] = useState('');
  const [newPhaseColor, setNewPhaseColor] = useState('#2563eb');

  if (!isOpen) return null;

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      ...project,
      ...meta,
      phases,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleAddPhase = () => {
    if (!newPhaseName.trim()) return;
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: newPhaseName.trim(),
      code: newPhaseCode.trim() || `P${phases.length + 1}`,
      color: newPhaseColor,
      order: phases.length + 1,
    };
    const updatedPhases = [...phases, newPhase];
    setPhases(updatedPhases);
    setNewPhaseName('');
    setNewPhaseCode('');
    onUpdateProject({
      ...project,
      phases: updatedPhases,
    });
  };

  const handleDeletePhase = (phaseId: string) => {
    if (phases.length <= 1) {
      alert('工程專案中至少需保留一個分項工程，無法刪除！');
      return;
    }
    const targetPhase = phases.find((p) => p.id === phaseId);
    const taskCount = project.tasks.filter((t) => t.phaseId === phaseId).length;

    if (taskCount > 0) {
      if (!confirm(`分項工程「${targetPhase?.name}」目前有 ${taskCount} 項工項作業。\n確定要一併刪除此分項工程及其所屬的所有工項嗎？`)) {
        return;
      }
    } else {
      if (!confirm(`確定要刪除分項工程「${targetPhase?.name}」嗎？`)) {
        return;
      }
    }

    const updatedPhases = phases.filter((p) => p.id !== phaseId);
    const updatedTasks = project.tasks.filter((t) => t.phaseId !== phaseId);
    setPhases(updatedPhases);
    onUpdateProject({
      ...project,
      phases: updatedPhases,
      tasks: updatedTasks,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">工程專案設定與分項管理</h2>
              <p className="text-xs text-slate-500">
                維護工程基本資料、分項工程結構 (WBS) 及載入標準範本。
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

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            工程基本資料
          </button>
          <button
            onClick={() => setActiveTab('phases')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'phases'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            分項工程架構 ({phases.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            標準工程範本庫
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto text-xs">
          {activeTab === 'info' && (
            <form onSubmit={handleSaveMeta} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  工程專案名稱 *
                </label>
                <input
                  type="text"
                  value={meta.name}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    標案 / 專案編號
                  </label>
                  <input
                    type="text"
                    value={meta.code}
                    onChange={(e) => setMeta({ ...meta, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    合約總造價 (萬元)
                  </label>
                  <input
                    type="number"
                    value={meta.totalBudget}
                    onChange={(e) => setMeta({ ...meta, totalBudget: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
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
                    value={meta.client}
                    onChange={(e) => setMeta({ ...meta, client: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    總承造廠商
                  </label>
                  <input
                    type="text"
                    value={meta.contractor}
                    onChange={(e) => setMeta({ ...meta, contractor: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  工地主任 / 專案負責技師
                </label>
                <input
                  type="text"
                  value={meta.projectManager}
                  onChange={(e) => setMeta({ ...meta, projectManager: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  專案工程概況說明
                </label>
                <textarea
                  rows={3}
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  儲存專案資訊
                </button>
              </div>
            </form>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-4">
              <div className="text-slate-500">
                本工程包含以下分項工程。您可以新增分項或刪除尚未建立工項的空分項。
              </div>

              {/* List of phases */}
              <div className="space-y-2">
                {phases.map((ph, idx) => {
                  const taskCount = project.tasks.filter((t) => t.phaseId === ph.id).length;
                  return (
                    <div
                      key={ph.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-4 text-slate-400 font-mono text-center shrink-0">{idx + 1}</span>
                        <input
                          type="color"
                          value={ph.color}
                          onChange={(e) => {
                            const updated = phases.map((p) =>
                              p.id === ph.id ? { ...p, color: e.target.value } : p
                            );
                            setPhases(updated);
                            onUpdateProject({ ...project, phases: updated });
                          }}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
                          title="修改分項代表顏色"
                        />
                        <input
                          type="text"
                          value={ph.name}
                          onChange={(e) => {
                            const updated = phases.map((p) =>
                              p.id === ph.id ? { ...p, name: e.target.value } : p
                            );
                            setPhases(updated);
                            onUpdateProject({ ...project, phases: updated });
                          }}
                          placeholder="分項工程名稱"
                          className="font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden flex-1"
                        />
                        <input
                          type="text"
                          value={ph.code}
                          onChange={(e) => {
                            const updated = phases.map((p) =>
                              p.id === ph.id ? { ...p, code: e.target.value.toUpperCase() } : p
                            );
                            setPhases(updated);
                            onUpdateProject({ ...project, phases: updated });
                          }}
                          placeholder="代碼"
                          className="font-mono text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 text-3xs w-16 focus:ring-1 focus:ring-blue-500 focus:outline-hidden shrink-0"
                          title="分項代碼"
                        />
                        <span className="text-slate-400 font-mono text-3xs shrink-0 whitespace-nowrap">
                          {taskCount} 工項
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeletePhase(ph.id)}
                        disabled={phases.length <= 1}
                        title={phases.length <= 1 ? '至少需保留一個分項' : taskCount > 0 ? `刪除分項及其 ${taskCount} 項工項` : '刪除此分項'}
                        className={`p-1.5 rounded transition-colors shrink-0 ${
                          phases.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Phase Form */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/70 space-y-2 pt-3">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>新增分項工程</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="分項工程名稱 (例: 景觀水景綠化工程)"
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-slate-200 rounded-md bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="簡碼 (例: LAN)"
                      value={newPhaseCode}
                      onChange={(e) => setNewPhaseCode(e.target.value)}
                      className="px-2 py-1.5 border border-slate-200 rounded-md bg-white w-20 font-mono"
                    />
                    <input
                      type="color"
                      value={newPhaseColor}
                      onChange={(e) => setNewPhaseColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhase}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold whitespace-nowrap"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="text-slate-500">
                快速切換或載入標準工程專案範本（含各分項工程結構、管制節點與前置相依關係）：
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Template 1 */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:border-blue-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>台北科技園區 B棟商辦改造工程</span>
                    </div>
                    <p className="text-3xs text-slate-500 leading-relaxed">
                      涵蓋招標決標 (50%)、油漆工程 (90天)、天花板拆除、空調水管保溫、排煙風機保溫、隔間導擺及天花板燈具安裝等工項管制。
                    </p>
                    <div className="mt-2 text-3xs font-mono text-blue-600 font-semibold">
                      4 大分項工程 · 10 項工項 (您的原版資料)
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('確定要載入此商辦改造工程資料嗎？現有排程將重置為此工程版本。')) {
                        onLoadTemplate(BUILDING_CONSTRUCTION_PROJECT);
                        onClose();
                      }
                    }}
                    className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-2xs"
                  >
                    載入此工程 (還原原版資料)
                  </button>
                </div>

                {/* Template 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>企業總部辦公室精品裝修工程</span>
                    </div>
                    <p className="text-3xs text-slate-500 leading-relaxed">
                      500坪科技企業辦公空間，含拆除放樣、天花空調、高架網路、消防勘驗與甲醛細清驗收管制點。
                    </p>
                    <div className="mt-2 text-3xs font-mono text-slate-400">
                      6 大分項工程 · 9 項工項 · 4 個重大管制節點
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('確定要載入室內裝修工程範本嗎？現有資料將被取代。')) {
                        onLoadTemplate(INTERIOR_DECORATION_PROJECT);
                        onClose();
                      }
                    }}
                    className="mt-3 w-full py-2 bg-white border border-slate-200 hover:border-purple-500 hover:text-purple-600 rounded-lg font-semibold text-slate-700 transition-colors shadow-2xs"
                  >
                    載入此裝修範本
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
