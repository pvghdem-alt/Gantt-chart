import React, { useState, useEffect } from 'react';
import { Phase, Project } from '../types/project';
import { X, Layers, Trash2, Check, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';

interface PhaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase: Phase | null;
  project: Project;
  onSavePhase: (updatedPhase: Phase) => void;
  onDeletePhase?: (phaseId: string, options?: { deleteTasks?: boolean; moveToPhaseId?: string }) => void;
}

const PRESET_COLORS = [
  '#64748b', // Slate
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#059669', // Emerald
  '#d97706', // Amber
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#7c3aed', // Purple
  '#475569', // Charcoal
];

export const PhaseEditModal: React.FC<PhaseEditModalProps> = ({
  isOpen,
  onClose,
  phase,
  project,
  onSavePhase,
  onDeletePhase,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#2563eb');

  // Deletion confirmation sub-state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'cascade' | 'move'>('cascade');
  const [targetMovePhaseId, setTargetMovePhaseId] = useState<string>('');

  const otherPhases = project.phases.filter((p) => phase && p.id !== phase.id);

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setCode(phase.code || '');
      setColor(phase.color || '#2563eb');
      setIsConfirmingDelete(false);
      setDeleteMode('cascade');
      setTargetMovePhaseId(otherPhases[0]?.id || '');
    }
  }, [phase, isOpen]);

  if (!isOpen || !phase) return null;

  const taskCount = project.tasks.filter((t) => t.phaseId === phase.id).length;
  const isOnlyPhase = project.phases.length <= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSavePhase({
      ...phase,
      name: name.trim(),
      code: code.trim() || phase.code,
      color,
    });
    onClose();
  };

  const handleStartDelete = () => {
    if (isOnlyPhase) {
      alert('工程專案中至少需保留一個分項工程，無法刪除最後一個分項！');
      return;
    }

    if (taskCount === 0) {
      if (confirm(`確定要刪除分項工程「${phase.name}」嗎？`)) {
        onDeletePhase?.(phase.id);
        onClose();
      }
      return;
    }

    // Has tasks: open deletion strategy panel
    setIsConfirmingDelete(true);
  };

  const handleExecuteDelete = () => {
    if (!onDeletePhase) return;

    if (taskCount > 0) {
      if (deleteMode === 'cascade') {
        if (!confirm(`確定要刪除分項「${phase.name}」及其所屬的全部 ${taskCount} 項工項作業嗎？此操作將清除所有相依關聯。`)) {
          return;
        }
        onDeletePhase(phase.id, { deleteTasks: true });
      } else {
        if (!targetMovePhaseId) {
          alert('請選擇欲轉移工項之目標分項工程！');
          return;
        }
        const targetPhase = otherPhases.find((p) => p.id === targetMovePhaseId);
        if (!confirm(`確定要將 ${taskCount} 項工項移轉至「${targetPhase?.name}」並刪除「${phase.name}」分項嗎？`)) {
          return;
        }
        onDeletePhase(phase.id, { moveToPhaseId: targetMovePhaseId });
      }
    } else {
      onDeletePhase(phase.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-slate-300"
              style={{ backgroundColor: color }}
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">調整分項工程名稱與設定</h2>
              <p className="text-xs text-slate-500">修改分項名稱、代碼、識別色彩或刪除分項。</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If user clicked Delete on a phase that has tasks, show deletion resolution panel */}
        {isConfirmingDelete ? (
          <div className="p-5 space-y-4 text-xs bg-red-50/40 border-b border-red-100">
            <div className="flex items-start gap-3 p-3 bg-red-100/70 border border-red-200 rounded-lg text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">確認刪除分項工程「{phase.name}」</h4>
                <p className="text-xs mt-0.5 text-red-800">
                  此分項目前已有 <strong className="font-mono">{taskCount}</strong> 項綁定的工項作業。請選擇處理所屬工項的方式：
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
              {/* Option 1: Cascade delete */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'cascade'}
                  onChange={() => setDeleteMode('cascade')}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900">
                    一併刪除分項工程及所屬 {taskCount} 項工項
                  </div>
                  <div className="text-slate-500 text-3xs mt-0.5">
                    該分項下的所有作業將全數刪除，其他工項若有相依於此分項之工項，相依關聯亦會自動清除。
                  </div>
                </div>
              </label>

              {/* Option 2: Move tasks */}
              {otherPhases.length > 0 && (
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'move'}
                    onChange={() => setDeleteMode('move')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="font-bold text-slate-900">
                        保留工項，全部移轉至其他分項
                      </div>
                      <div className="text-slate-500 text-3xs mt-0.5">
                        所屬 {taskCount} 項作業將完整保留並自動移至您指定的目標分項，自動重新編排 WBS。
                      </div>
                    </div>

                    {deleteMode === 'move' && (
                      <div className="pt-1.5 flex items-center gap-2">
                        <CornerDownRight className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-700">移轉至：</span>
                        <select
                          value={targetMovePhaseId}
                          onChange={(e) => setTargetMovePhaseId(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 flex-1 font-medium"
                        >
                          {otherPhases.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                返回編輯
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>確認刪除分項</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Form Body */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                分項工程名稱 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 1.0 前置準備與假設工程 或 1.0 拆除工程"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium text-xs"
                required
                autoFocus
              />
              <span className="text-3xs text-slate-400 mt-1 block">
                建議包含層級編號（如 1.0、2.0），以保持甘特圖與 WBS 編號之結構清晰。
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  分項英文代碼 (Code)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="例如: PRE, SUB, STR"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  所屬工項數
                </label>
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-medium flex items-center justify-between">
                  <span>{taskCount} 項作業</span>
                  {taskCount > 0 && (
                    <span className="text-3xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">已綁定</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                分項識別色標
              </label>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === c ? 'scale-115 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="自訂顏色"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {onDeletePhase && (
                <button
                  type="button"
                  onClick={handleStartDelete}
                  disabled={isOnlyPhase}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isOnlyPhase
                      ? 'text-slate-300 bg-slate-100 cursor-not-allowed border border-slate-200'
                      : 'text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 bg-red-50/50'
                  }`}
                  title={isOnlyPhase ? '至少需保留一個分項，無法刪除' : '刪除分項工程'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>刪除此分項</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
                >
                  儲存名稱
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
