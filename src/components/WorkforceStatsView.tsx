import React, { useState, useMemo, useEffect } from 'react';
import { Project, DailyWorkforceLog, CrewCountEntry } from '../types/project';
import { TODAY_STR } from '../utils/dateUtils';
import {
  Users,
  BarChart3,
  TrendingUp,
  Plus,
  Trash2,
  Download,
  Copy,
  Calendar,
  Check,
  Search,
  Sparkles,
  Edit2,
  CloudSun,
  X,
} from 'lucide-react';

interface WorkforceStatsViewProps {
  project: Project;
  onUpdateWorkforceLogs: (logs: DailyWorkforceLog[]) => void;
}

const TRADE_PALETTE = [
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0284c7', // sky-600
  '#16a34a', // green-600
  '#64748b', // slate-500
];

const DEFAULT_TRADES = [
  '空調冷凍工班',
  '油漆塗裝工班',
  '拆除清運工班',
  '水電消防工班',
  '木作隔間工班',
  '天花板燈具工班',
  '鋼構焊接工班',
  '泥作防水工班',
  '安全清潔雜工',
];

export const WorkforceStatsView: React.FC<WorkforceStatsViewProps> = ({
  project,
  onUpdateWorkforceLogs,
}) => {
  const logs = useMemo(() => {
    const raw = project.workforceLogs || [];
    return [...raw].sort((a, b) => a.date.localeCompare(b.date));
  }, [project.workforceLogs]);

  // Chart filters & modes
  const [rangeFilter, setRangeFilter] = useState<'7d' | '14d' | '30d' | 'all'>('14d');
  const [chartMode, setChartMode] = useState<'stacked' | 'trend'>('stacked');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for daily entry
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (logs.length > 0) return logs[logs.length - 1].date;
    return TODAY_STR;
  });
  const [weather, setWeather] = useState<'晴' | '陰' | '雨' | '其他'>('晴');
  const [entries, setEntries] = useState<CrewCountEntry[]>([
    { trade: '', workers: 0, taskId: '', notes: '' },
  ]);
  const [safetyNotes, setSafetyNotes] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  // Sync form when selectedDate or project logs change
  useEffect(() => {
    const existing = logs.find((l) => l.date === selectedDate);
    if (existing) {
      setWeather(existing.weather || '晴');
      setEntries(
        existing.entries.length > 0
          ? existing.entries.map((e) => ({ ...e }))
          : [{ trade: '', workers: 0, taskId: '', notes: '' }]
      );
      setSafetyNotes(existing.safetyNotes || '');
    } else {
      setWeather('晴');
      setEntries([{ trade: '', workers: 0, taskId: '', notes: '' }]);
      setSafetyNotes('');
    }
  }, [selectedDate, project.id, logs]);

  // Collect all known trades (from project tasks' assignees + previous logs + standard presets)
  const suggestedTrades = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.entries.forEach((e) => e.trade && set.add(e.trade)));
    project.tasks.forEach((t) => {
      if (t.assignee?.trim()) set.add(t.assignee.trim());
    });
    DEFAULT_TRADES.forEach((tr) => set.add(tr));
    return Array.from(set);
  }, [logs, project.tasks]);

  // Filtered logs for chart based on rangeFilter
  const chartLogs = useMemo(() => {
    if (logs.length === 0) return [];
    if (rangeFilter === 'all') return logs;
    const limit = rangeFilter === '7d' ? 7 : rangeFilter === '14d' ? 14 : 30;
    return logs.slice(-limit);
  }, [logs, rangeFilter]);

  // Aggregate metrics & trade breakdown for chartLogs
  const analytics = useMemo(() => {
    const tradeTotals = new Map<string, number>();
    let totalManDays = 0;
    let peakDay: { date: string; count: number } | null = null;

    for (const log of chartLogs) {
      totalManDays += log.totalWorkers;
      if (!peakDay || log.totalWorkers > peakDay.count) {
        peakDay = { date: log.date, count: log.totalWorkers };
      }
      for (const e of log.entries) {
        const name = e.trade.trim() || '未分類工班';
        tradeTotals.set(name, (tradeTotals.get(name) || 0) + (Number(e.workers) || 0));
      }
    }

    const sortedTrades = Array.from(tradeTotals.entries())
      .map(([trade, count]) => ({
        trade,
        count,
        share: totalManDays > 0 ? Math.round((count / totalManDays) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Assign stable colors to top trades; group >7 into "其他工班" for stacked chart clarity
    const topTradeNames = sortedTrades.slice(0, 7).map((t) => t.trade);
    const tradeColorMap = new Map<string, string>();
    topTradeNames.forEach((name, idx) => {
      tradeColorMap.set(name, TRADE_PALETTE[idx % TRADE_PALETTE.length]);
    });
    tradeColorMap.set('其他工班', TRADE_PALETTE[7]);

    const avgWorkers =
      chartLogs.length > 0 ? Math.round((totalManDays / chartLogs.length) * 10) / 10 : 0;
    const latestLog = chartLogs.length > 0 ? chartLogs[chartLogs.length - 1] : null;
    const maxDailyWorkers = Math.max(10, ...chartLogs.map((l) => l.totalWorkers));

    return {
      totalManDays,
      avgWorkers,
      peakDay,
      latestLog,
      sortedTrades,
      topTradeNames,
      tradeColorMap,
      maxDailyWorkers,
    };
  }, [chartLogs]);

  // Form handlers
  const formTotalWorkers = useMemo(() => {
    return entries.reduce((sum, e) => sum + Math.max(0, Number(e.workers) || 0), 0);
  }, [entries]);

  const handleAddEntryRow = () => {
    setEntries((prev) => [...prev, { trade: '', workers: 0, taskId: '', notes: '' }]);
  };

  const handleRemoveEntryRow = (idx: number) => {
    setEntries((prev) => {
      if (prev.length <= 1) return [{ trade: '', workers: 0, taskId: '', notes: '' }];
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleEntryChange = (idx: number, patch: Partial<CrewCountEntry>) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const handleCopyPreviousDay = () => {
    const candidates = logs.filter((l) => l.date < selectedDate);
    const prev = candidates.length > 0 ? candidates[candidates.length - 1] : logs[logs.length - 1];
    if (!prev) {
      setErrorNotice('目前尚無前一筆出工紀錄可供複製。');
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }
    setEntries(
      prev.entries.map((e) => ({
        trade: e.trade,
        workers: e.workers,
        taskId: e.taskId || '',
        notes: e.notes || '',
      }))
    );
    setErrorNotice(null);
    setSaveNotice(`已複製 ${prev.date} 之工班編制`);
    setTimeout(() => setSaveNotice(null), 2500);
  };

  const handlePopulateFromSchedule = () => {
    // Find tasks overlapping selectedDate; fallback to active tasks if none overlap
    const activeOnDate = project.tasks.filter(
      (t) => t.startDate <= selectedDate && t.endDate >= selectedDate
    );
    const sourceTasks =
      activeOnDate.length > 0 ? activeOnDate : project.tasks.slice(0, 6);

    if (sourceTasks.length === 0) {
      setErrorNotice('目前專案尚無排程工項。');
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }

    const mapped: CrewCountEntry[] = sourceTasks.map((t) => ({
      trade: t.assignee?.trim() || `${t.name}工班`,
      workers: 0,
      taskId: t.id,
      notes: `${t.wbs} ${t.name}`,
    }));

    setEntries(mapped);
    setErrorNotice(null);
    setSaveNotice(
      activeOnDate.length > 0
        ? `已帶入 ${selectedDate} 排程施工中工項 (${mapped.length} 班)，請填寫進場人數`
        : `當日無重疊排程工項，已帶入專案工項清單供填報`
    );
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    const cleanedEntries: CrewCountEntry[] = entries
      .map((item) => ({
        trade: item.trade.trim(),
        workers: Math.max(0, Math.round(Number(item.workers) || 0)),
        ...(item.taskId ? { taskId: item.taskId } : {}),
        ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
      }))
      .filter((item) => item.trade.length > 0 || item.workers > 0)
      .map((item) => ({
        ...item,
        trade: item.trade || '一般出工班',
      }));

    if (cleanedEntries.length === 0) {
      setErrorNotice('請至少填寫一筆工班名稱與進場人數！');
      setTimeout(() => setErrorNotice(null), 3500);
      return;
    }

    const totalWorkers = cleanedEntries.reduce((sum, item) => sum + item.workers, 0);
    const newLog: DailyWorkforceLog = {
      id: `wf-${selectedDate}`,
      date: selectedDate,
      weather,
      entries: cleanedEntries,
      totalWorkers,
      ...(safetyNotes.trim() ? { safetyNotes: safetyNotes.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = logs.findIndex((l) => l.date === selectedDate);
    const updatedLogs =
      existingIdx >= 0
        ? logs.map((l, idx) => (idx === existingIdx ? newLog : l))
        : [...logs, newLog].sort((a, b) => a.date.localeCompare(b.date));

    onUpdateWorkforceLogs(updatedLogs);
    setSaveNotice(`已儲存 ${selectedDate} 出工紀錄（共 ${totalWorkers} 人）並更新圖表`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleDeleteLog = (date: string) => {
    const remaining = logs.filter((l) => l.date !== date);
    onUpdateWorkforceLogs(remaining);
    setConfirmDeleteDate(null);
    if (date === selectedDate) {
      setEntries([{ trade: '', workers: 0, taskId: '', notes: '' }]);
      setSafetyNotes('');
    }
    setSaveNotice(`已刪除 ${date} 出工紀錄`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      setErrorNotice('目前尚無出工統計資料可匯出。');
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }
    const allTrades = Array.from(
      new Set(logs.flatMap((l) => l.entries.map((e) => e.trade)))
    );
    const header = ['日期', '天氣', ...allTrades, '當日總人數', '工安／施工記事'];
    const rows = logs.map((l) => {
      const countsByTrade = allTrades.map((tr) => {
        const sum = l.entries
          .filter((e) => e.trade === tr)
          .reduce((s, e) => s + e.workers, 0);
        return String(sum);
      });
      const safeNotes = `"${(l.safetyNotes || '').replace(/"/g, '""')}"`;
      return [l.date, l.weather || '', ...countsByTrade, String(l.totalWorkers), safeNotes].join(',');
    });

    const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.code}_每日工班出工統計_${TODAY_STR}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // SVG Chart geometry
  const svgWidth = 820;
  const svgHeight = 280;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 42;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const yMax = useMemo(() => {
    const rawMax = analytics.maxDailyWorkers;
    const step = rawMax <= 20 ? 5 : rawMax <= 50 ? 10 : rawMax <= 120 ? 20 : 50;
    return Math.max(step * 2, Math.ceil((rawMax * 1.15) / step) * step);
  }, [analytics.maxDailyWorkers]);

  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(yMax * r));
  }, [yMax]);

  const getY = (val: number) => padTop + chartH - (val / Math.max(1, yMax)) * chartH;

  // Filtered table rows
  const filteredTableLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...logs]
      .reverse()
      .filter((l) => {
        if (!q) return true;
        return (
          l.date.includes(q) ||
          (l.safetyNotes || '').toLowerCase().includes(q) ||
          l.entries.some((e) => e.trade.toLowerCase().includes(q))
        );
      });
  }, [logs, searchTerm]);

  const existingSelectedLog = logs.find((l) => l.date === selectedDate);
  const hoveredLog = hoveredDate ? chartLogs.find((l) => l.date === hoveredDate) : null;

  return (
    <div className="space-y-5 max-w-[1640px] mx-auto pb-8">
      {/* 1. KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>統計期間累計人日</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {analytics.totalManDays.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">人日</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1.5">
            <span>涵蓋紀錄</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {chartLogs.length} 個出工日
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>平均每日進場人數</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-700 font-mono tabular-nums">
              {analytics.avgWorkers}
            </span>
            <span className="text-xs text-slate-500">人 / 日</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1.5">
            <span>最新登記</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              {analytics.latestLog
                ? `${analytics.latestLog.date} (${analytics.latestLog.totalWorkers} 人)`
                : '尚無紀錄'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>單日最高進場尖峰</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 font-mono tabular-nums">
              {analytics.peakDay ? analytics.peakDay.count : 0}
            </span>
            <span className="text-xs text-slate-500">人</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1.5">
            <span>尖峰日期</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {analytics.peakDay ? analytics.peakDay.date : '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>活躍施工工班數</span>
            <CloudSun className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {analytics.sortedTrades.length}
            </span>
            <span className="text-xs text-slate-500">工班 / 工種</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1.5 truncate">
            <span>主力工班</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700 truncate">
              {analytics.sortedTrades[0]
                ? `${analytics.sortedTrades[0].trade} (${analytics.sortedTrades[0].share}%)`
                : '尚無資料'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Auto-Generated Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Main Chart (2 cols): Daily Workforce Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>每日進場工班人數自動統計圖表</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                依每日登記資料即時繪製堆疊分佈與出工趨勢，點擊長條可直接載入該日紀錄進行編輯。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chart type switch */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-2xs font-medium">
                <button
                  type="button"
                  onClick={() => setChartMode('stacked')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartMode === 'stacked'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  工班堆疊圖
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('trend')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartMode === 'trend'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  人數趨勢折線
                </button>
              </div>

              {/* Timeframe filter */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-2xs font-medium">
                {(
                  [
                    { key: '7d', label: '近7筆' },
                    { key: '14d', label: '近14筆' },
                    { key: '30d', label: '近30筆' },
                    { key: 'all', label: '全部' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRangeFilter(item.key)}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      rangeFilter === item.key
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出 CSV</span>
              </button>
            </div>
          </div>

          {chartLogs.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <Users className="w-9 h-9 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-700">
                  尚未有每日進場工班紀錄
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  在下方填報任何一天的工班進場人數並儲存後，系統將自動產生每日工班堆疊圖表與趨勢折線圖。
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePopulateFromSchedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>依甘特圖排程帶入今日工班</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {/* Hover summary strip */}
              <div className="min-h-[24px] flex flex-wrap items-center justify-between gap-2 text-2xs px-1">
                {hoveredLog ? (
                  <div className="flex flex-wrap items-center gap-2 text-slate-700 font-mono tabular-nums">
                    <span className="font-bold text-slate-900">{hoveredLog.date}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-blue-600">
                      共 {hoveredLog.totalWorkers} 人
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-sans">
                      {hoveredLog.entries
                        .map((e) => `${e.trade} ${e.workers}人`)
                        .join('、')}
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex items-center gap-2">
                    <span>移動滑鼠至圖表日期可檢視當日各工班人數明細</span>
                    <span aria-hidden="true">·</span>
                    <span>紅色虛線為期間平均 ({analytics.avgWorkers} 人/日)</span>
                  </div>
                )}
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto min-w-[620px] font-mono text-3xs select-none"
                >
                  {/* Horizontal Grid Lines & Y-Axis Labels */}
                  {yTicks.map((val) => {
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
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Average reference line */}
                  {analytics.avgWorkers > 0 && (
                    <g>
                      <line
                        x1={padLeft}
                        y1={getY(analytics.avgWorkers)}
                        x2={svgWidth - padRight}
                        y2={getY(analytics.avgWorkers)}
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="5,4"
                      />
                      <text
                        x={svgWidth - padRight}
                        y={getY(analytics.avgWorkers) - 5}
                        textAnchor="end"
                        fill="#dc2626"
                        fontSize="10"
                      >
                        平均 {analytics.avgWorkers}人
                      </text>
                    </g>
                  )}

                  {chartMode === 'stacked' ? (
                    // Stacked Bar Chart
                    chartLogs.map((log, i) => {
                      const slotW = chartW / Math.max(1, chartLogs.length);
                      const barW = Math.min(42, Math.max(10, slotW * 0.62));
                      const cx = padLeft + i * slotW + slotW / 2;
                      const x = cx - barW / 2;
                      const isSelected = log.date === selectedDate;
                      const isHovered = log.date === hoveredDate;

                      // Group entries into top trades + 其他工班
                      const grouped = new Map<string, number>();
                      log.entries.forEach((entry) => {
                        const rawName = entry.trade.trim() || '未分類工班';
                        const bucket = analytics.topTradeNames.includes(rawName)
                          ? rawName
                          : '其他工班';
                        grouped.set(
                          bucket,
                          (grouped.get(bucket) || 0) + (Number(entry.workers) || 0)
                        );
                      });

                      const orderedBuckets = [...analytics.topTradeNames, '其他工班'].filter(
                        (b) => (grouped.get(b) || 0) > 0
                      );

                      let currentBottom = 0;
                      return (
                        <g
                          key={log.date}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredDate(log.date)}
                          onMouseLeave={() => setHoveredDate(null)}
                          onClick={() => setSelectedDate(log.date)}
                        >
                          {/* Highlight background column */}
                          {(isSelected || isHovered) && (
                            <rect
                              x={cx - slotW / 2 + 2}
                              y={padTop}
                              width={Math.max(4, slotW - 4)}
                              height={chartH}
                              rx="4"
                              fill={isSelected ? '#eff6ff' : '#f8fafc'}
                            />
                          )}

                          {orderedBuckets.map((bucket) => {
                            const count = grouped.get(bucket) || 0;
                            const yTop = getY(currentBottom + count);
                            const yBot = getY(currentBottom);
                            const segH = Math.max(1, yBot - yTop);
                            currentBottom += count;
                            return (
                              <rect
                                key={bucket}
                                x={x}
                                y={yTop}
                                width={barW}
                                height={segH}
                                fill={analytics.tradeColorMap.get(bucket) || '#64748b'}
                                stroke="#ffffff"
                                strokeWidth="1"
                                rx="2"
                              />
                            );
                          })}

                          {/* Total label on top of bar */}
                          <text
                            x={cx}
                            y={Math.max(12, getY(log.totalWorkers) - 6)}
                            textAnchor="middle"
                            fill={isSelected ? '#1d4ed8' : '#334155'}
                            fontWeight="700"
                            fontSize="10"
                          >
                            {log.totalWorkers}
                          </text>

                          {/* X-axis date label */}
                          {(chartLogs.length <= 16 ||
                            i % Math.ceil(chartLogs.length / 10) === 0 ||
                            i === chartLogs.length - 1) && (
                            <text
                              x={cx}
                              y={svgHeight - 14}
                              textAnchor="middle"
                              fill={isSelected ? '#1d4ed8' : '#64748b'}
                              fontWeight={isSelected ? '700' : '400'}
                              fontSize="10"
                            >
                              {log.date.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })
                  ) : (
                    // Line Trend Chart
                    (() => {
                      const n = chartLogs.length;
                      const getPtX = (idx: number) =>
                        n === 1
                          ? padLeft + chartW / 2
                          : padLeft + (idx / (n - 1)) * chartW;
                      const linePath = chartLogs
                        .map(
                          (pt, i) =>
                            `${i === 0 ? 'M' : 'L'} ${getPtX(i)} ${getY(pt.totalWorkers)}`
                        )
                        .join(' ');
                      const areaPath =
                        n > 1
                          ? `${linePath} L ${getPtX(n - 1)} ${getY(0)} L ${getPtX(0)} ${getY(0)} Z`
                          : '';

                      return (
                        <g>
                          {areaPath && (
                            <path d={areaPath} fill="#3b82f6" fillOpacity="0.12" />
                          )}
                          {n > 1 && (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {chartLogs.map((log, i) => {
                            const cx = getPtX(i);
                            const cy = getY(log.totalWorkers);
                            const isSelected = log.date === selectedDate;
                            return (
                              <g
                                key={log.date}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredDate(log.date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                onClick={() => setSelectedDate(log.date)}
                              >
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isSelected ? 6 : 4.5}
                                  fill={isSelected ? '#1d4ed8' : '#2563eb'}
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                                <text
                                  x={cx}
                                  y={Math.max(12, cy - 10)}
                                  textAnchor="middle"
                                  fill="#1e293b"
                                  fontWeight="700"
                                  fontSize="10"
                                >
                                  {log.totalWorkers}
                                </text>
                                {(n <= 16 ||
                                  i % Math.ceil(n / 10) === 0 ||
                                  i === n - 1) && (
                                  <text
                                    x={cx}
                                    y={svgHeight - 14}
                                    textAnchor="middle"
                                    fill={isSelected ? '#1d4ed8' : '#64748b'}
                                    fontWeight={isSelected ? '700' : '400'}
                                    fontSize="10"
                                  >
                                    {log.date.slice(5)}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()
                  )}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Sub Chart (1 col): Trade Breakdown Share */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              各工班累計出工佔比分析
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              統計期間內各工種累計投入人日與比重排序
            </p>
          </div>

          {analytics.sortedTrades.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-center text-xs text-slate-400">
              登錄每日工班人數後將自動計算各工班人日佔比
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {analytics.sortedTrades.map((item) => {
                const color =
                  analytics.tradeColorMap.get(item.trade) || '#64748b';
                return (
                  <div key={item.trade} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-slate-800 truncate">
                          {item.trade}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-2xs shrink-0">
                        <span className="font-bold text-slate-900">
                          {item.count.toLocaleString()} 人日
                        </span>
                        <span className="text-slate-400 ml-1.5">
                          ({item.share}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${Math.min(100, item.share)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Daily Crew Attendance Entry Form & History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Daily Entry Form (5 cols) */}
        <form
          onSubmit={handleSaveLog}
          className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {existingSelectedLog ? `編輯 ${selectedDate} 出工紀錄` : '登記每日進場工班人數'}
              </h3>
              <p className="text-3xs text-slate-500 mt-0.5">
                儲存後將同步更新上方圖表並寫入雲端資料庫
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-3xs text-slate-400">本日合計</div>
              <div className="text-lg font-bold text-blue-600">{formTotalWorkers} 人</div>
            </div>
          </div>

          {saveNotice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveNotice(null)}
                className="text-emerald-600 hover:text-emerald-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorNotice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <span>{errorNotice}</span>
              <button
                type="button"
                onClick={() => setErrorNotice(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Date & Weather */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                施工日期
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                工地天候
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as typeof weather)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="晴">晴</option>
                <option value="陰">陰</option>
                <option value="雨">雨</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Quick Helper Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPreviousDay}
              className="flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Copy className="w-3 h-3" />
              <span>複製前一日工班</span>
            </button>
            <button
              type="button"
              onClick={handlePopulateFromSchedule}
              className="flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3" />
              <span>依甘特圖排程帶入工班</span>
            </button>
          </div>

          {/* Crew Entries List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>進場工班明細</span>
              <button
                type="button"
                onClick={handleAddEntryRow}
                className="flex items-center gap-1 text-2xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增工班列</span>
              </button>
            </div>

            <datalist id="workforce-trade-suggestions">
              {suggestedTrades.map((tr) => (
                <option key={tr} value={tr} />
              ))}
            </datalist>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      list="workforce-trade-suggestions"
                      value={entry.trade}
                      onChange={(e) => handleEntryChange(idx, { trade: e.target.value })}
                      placeholder="工班／工種名稱（例: 空調工班）"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={entry.workers}
                        onChange={(e) =>
                          handleEntryChange(idx, {
                            workers: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-md font-mono tabular-nums text-right text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-2xs text-slate-500">人</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntryRow(idx)}
                      title="移除此工班列"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={entry.taskId || ''}
                      onChange={(e) => handleEntryChange(idx, { taskId: e.target.value })}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-md text-3xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">關聯工項（選填）</option>
                      {project.tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.wbs} {t.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={entry.notes || ''}
                      onChange={(e) => handleEntryChange(idx, { notes: e.target.value })}
                      placeholder="施作區域 / 備註"
                      className="px-2 py-1 bg-white border border-slate-200 rounded-md text-3xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Daily Site Notes */}
          <div className="text-xs">
            <label className="block text-slate-700 font-semibold mb-1">
              工安工具箱會議 / 現場出工記事（選填）
            </label>
            <textarea
              rows={2}
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
              placeholder="例如：完成高架作業勤前教育、配戴安全帶與安全帽檢查合格"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            {existingSelectedLog ? '更新本日出工統計' : '儲存本日出工統計'}
          </button>
        </form>

        {/* Right: Attendance History Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                每日進場工班歷史統計總表 ({logs.length} 筆)
              </h3>
              <p className="text-3xs text-slate-500 mt-0.5">
                點擊任一筆紀錄即可載入編輯，系統依日期自動排序
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋日期、工班名稱或記事..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
          </div>

          {filteredTableLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {logs.length === 0
                ? '尚無出工紀錄，請於左側填寫並儲存第一筆每日出工統計。'
                : '找不到符合搜尋條件的出工紀錄。'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 whitespace-nowrap">施工日期</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">天候</th>
                    <th className="py-2.5 px-3">進場工班與人數明細</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">合計人數</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableLogs.map((log) => {
                    const isSelected = log.date === selectedDate;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedDate(log.date)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap align-top">
                          {log.date}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap align-top">
                          {log.weather || '-'}
                        </td>
                        <td className="py-3 px-3 align-top space-y-1">
                          <div className="text-slate-800 leading-relaxed">
                            {log.entries.map((e, i) => (
                              <span key={i}>
                                {i > 0 && (
                                  <span className="text-slate-300 mx-1.5" aria-hidden="true">
                                    ·
                                  </span>
                                )}
                                <span className="font-medium">{e.trade}</span>{' '}
                                <span className="font-mono tabular-nums text-blue-700 font-semibold">
                                  {e.workers}人
                                </span>
                              </span>
                            ))}
                          </div>
                          {log.safetyNotes && (
                            <div className="text-3xs text-slate-500">
                              記事：{log.safetyNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap align-top">
                          {log.totalWorkers} 人
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                          {confirmDeleteDate === log.date ? (
                            <div
                              className="inline-flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.date)}
                                className="px-2 py-1 text-3xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                              >
                                確定刪除
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDate(null)}
                                className="px-2 py-1 text-3xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(log.date);
                                }}
                                title="編輯此日紀錄"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteDate(log.date);
                                }}
                                title="刪除此日紀錄"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
