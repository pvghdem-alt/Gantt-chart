import React, { useState } from 'react';
import { ActiveView } from '../types/project';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flag,
  Link2,
  Layers,
  BarChart3,
  Users,
  Calendar,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

interface GanttTutorialViewProps {
  onNavigateView: (view: ActiveView) => void;
}

type ChapterId = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ch6';

const CHAPTERS: { id: ChapterId; num: string; title: string; subtitle: string }[] = [
  { id: 'ch1', num: '01', title: '認識甘特圖結構', subtitle: '橫軸、縱軸、長條與今日線' },
  { id: 'ch2', num: '02', title: 'WBS 拆解與權重', subtitle: '如何把大工程切細與算總進度' },
  { id: 'ch3', num: '03', title: '工項相依關係', subtitle: 'FS 先後順序與延誤連鎖反應' },
  { id: 'ch4', num: '04', title: '里程碑與關鍵路徑', subtitle: '哪些工期一天都不能拖？' },
  { id: 'ch5', num: '05', title: 'S 曲線與進度判讀', subtitle: '預定 vs 實際進度與落後預警' },
  { id: 'ch6', num: '06', title: '避坑指南與小測驗', subtitle: '常見錯誤、隨堂練習與實戰對照' },
];

type AnatomyZone = 'yaxis' | 'xaxis' | 'bar' | 'progress' | 'today' | 'milestone';

const ANATOMY_DETAILS: Record<
  AnatomyZone,
  {
    title: string;
    analogy: string;
    explanation: string;
    howToRead: string;
  }
> = {
  yaxis: {
    title: '縱軸（左側清單）：要做哪些事情？',
    analogy: '就像搬家或裝潢的「待辦事項清單」，由大分類再細分成小項目。',
    explanation:
      '每一橫列代表一項具體的工作（工項），並用階層編號（例如 1.0 前置作業 → 1.1 招標、1.2 拆除）排列順序。',
    howToRead: '從上往下看，能掌握整個專案共有多少分項與細節工作，以及各自負責的廠商或工班。',
  },
  xaxis: {
    title: '橫軸（上方刻度）：時間怎麼走？',
    analogy: '就像牆上的月曆或週曆，橫著向右推進。',
    explanation:
      '代表時間的流逝，可以切換成「日、週、月」不同縮放尺度。工程剛開始看細節用「日」，管理幾個月的大工程用「週」或「月」。',
    howToRead: '越往左邊代表越早發生，越往右邊代表越晚完工；對照上方日期就能知道某項工作在哪幾天進行。',
  },
  bar: {
    title: '任務長條（橫條）：工期有多長？',
    analogy: '把月曆上「3/5 到 3/12 要油漆」這幾天用螢光筆連成一條線。',
    explanation:
      '長條的「左端點」是預定開工日，「右端點」是預定完工日，整條的「長度」就是工期天數。',
    howToRead: '長條越長表示需要施工的天數越多；兩個長條上下重疊在同一個日期區間，代表它們會「同時並行施工」。',
  },
  progress: {
    title: '條內深色填滿：目前做到幾成？',
    analogy: '就像手機電池充電條，填滿一半代表完成 50%。',
    explanation:
      '長條內部的填色長度代表該工項目前的「實際完成百分比（0% ~ 100%）」。',
    howToRead: '搭配「今日基準紅線」一起看：如果紅線已經超過該工項一半，填色卻還沒到一半，就代表進度偏慢了。',
  },
  today: {
    title: '今日基準線（紅色垂直線）：今天在哪裡？',
    analogy: '就像書籤，標記「我們現在正處於時間軸的哪一天」。',
    explanation:
      '這條貫穿全圖的垂直線代表今天日期。紅線左邊理論上都應該已經完成或正在收尾；紅線穿過的長條則是「今天現場正在施工的工項」。',
    howToRead: '一眼掃過紅線左側：如果有工項整條都在紅線左邊卻還沒 100%，代表已經逾期延誤。',
  },
  milestone: {
    title: '里程碑 / 管制節點（◆ 菱形）：關鍵檢查關卡',
    analogy: '就像馬拉松的「折返點」或考試「交卷時間」，不是過程本身，而是重要驗收時刻。',
    explanation:
      '用菱形符號標示的重大時刻，例如：簽約決標、隱蔽工程查驗、使用執照取得、正式完工驗收。',
    howToRead: '里程碑通常代表「不通過這關就不能往下走」或「達成後才能請款」的重要查核點。',
  },
};

interface QuizItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_ITEMS: QuizItem[] = [
  {
    id: 'q1',
    question: '在甘特圖上，如果某個任務的橫條特別長，代表什麼意思？',
    options: [
      '這項工作的花費金額最多',
      '這項工作的「預定工期（需要花的天數）」較長',
      '這項工作已經延誤了很久',
      '這項工作是專案裡最重要、絕對不能出錯的',
    ],
    correctIndex: 1,
    explanation:
      '甘特圖橫軸代表時間，因此長條「水平長度」純粹代表從開工到完工的天數（工期）。金額多寡看權重/預算，重要性則看里程碑或關鍵路徑標記。',
  },
  {
    id: 'q2',
    question: '工項 B 設定了「緊前工作為工項 A（FS 相依）」，且 A 的完工日延後了 4 天，請問 B 應該怎麼調整？',
    options: [
      'B 不用動，照原本日期提早進去施工就好',
      'B 必須同步往後順延 4 天，等 A 完工的隔天才能開工',
      'B 的工期必須強制縮短 4 天',
      '系統會把 A 自動刪除',
    ],
    correctIndex: 1,
    explanation:
      'FS（Finish-to-Start，完成後才能開始）是最常見的施工順序邏輯。例如「拆除完成」才能「水電配管」，前項延誤時，後項開工日必須跟著順延。',
  },
  {
    id: 'q3',
    question: '某案共 2 項工項：A 預算 10 萬元（進度 100%）、B 預算 90 萬元（進度 0%）。依預算佔比權重計算，全案真實總進度是多少？',
    options: ['50%', '10%', '90%', '0%'],
    correctIndex: 1,
    explanation:
      '總預算 = 10 + 90 = 100 萬元。A 權重為 10/100 = 10%，B 權重為 90/100 = 90%。全案進度 = (100% × 10%) + (0% × 90%) = 10%，才不會被小項目拉高進度產生錯覺。',
  },
  {
    id: 'q4',
    question: '關於「關鍵路徑（Critical Path）」的敘述，哪一項是正確的？',
    options: [
      '關鍵路徑上的工項，通常有很多天的緩衝時間（浮時）可以拖延',
      '每個工項都一定在關鍵路徑上',
      '關鍵路徑上的工項只要延誤 1 天，整個專案的最終完工日就會跟著延後 1 天',
      '關鍵路徑只跟預算有關，跟時間無關',
    ],
    correctIndex: 2,
    explanation:
      '關鍵路徑是從頭到尾耗時最長、沒有多餘緩衝時間（浮時為 0）的那條連續工項鏈，因此任何一環延誤都會直接拉長全案總工期。',
  },
];

export const GanttTutorialView: React.FC<GanttTutorialViewProps> = ({ onNavigateView }) => {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('ch1');
  const [showAllChapters, setShowAllChapters] = useState<boolean>(false);

  // Ch1 interactive state
  const [selectedZone, setSelectedZone] = useState<AnatomyZone>('bar');

  // Ch2 interactive weight & progress calculator state
  const [labTasks, setLabTasks] = useState([
    { id: 't1', name: '1.1 天花板拆除工程', budget: 100, progress: 100 },
    { id: 't2', name: '1.2 空調與水電配管', budget: 600, progress: 50 },
    { id: 't3', name: '1.3 天花封板與燈具安裝', budget: 300, progress: 0 },
  ]);

  // Ch3 interactive FS dependency simulator state
  const [delayDaysA, setDelayDaysA] = useState<number>(0);
  const [enableFSDependency, setEnableFSDependency] = useState<boolean>(true);

  // Ch4 interactive Critical Path simulator state
  const [criticalDelay, setCriticalDelay] = useState<number>(0);
  const [nonCriticalDelay, setNonCriticalDelay] = useState<number>(0);

  // Ch5 interactive S-curve simulator state
  const [simDay, setSimDay] = useState<number>(16);
  const [simScenario, setSimScenario] = useState<'ontrack' | 'delayed' | 'ahead'>('delayed');

  // Ch6 quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const currentChapterIdx = CHAPTERS.findIndex((c) => c.id === activeChapter);
  const shouldRenderChapter = (id: ChapterId) => showAllChapters || activeChapter === id;

  // Calculations for Ch2
  const labTotalBudget = labTasks.reduce((s, t) => s + Math.max(0, t.budget), 0);
  const labArithmeticAvg = Math.round(
    labTasks.reduce((s, t) => s + t.progress, 0) / labTasks.length
  );
  const labWeightedProgress =
    labTotalBudget > 0
      ? Math.round(
          labTasks.reduce(
            (s, t) => s + t.progress * (Math.max(0, t.budget) / labTotalBudget),
            0
          ) * 10
        ) / 10
      : 0;

  // Calculations for Ch3
  const baseA = { start: 1, dur: 5 }; // Day 1-5
  const baseBStart = enableFSDependency ? baseA.start + baseA.dur + delayDaysA : 6;
  const baseB = { start: baseBStart, dur: 6 };
  const baseCStart = enableFSDependency ? baseB.start + baseB.dur : 12;
  const baseC = { start: baseCStart, dur: 5 };
  const baseDStart = enableFSDependency ? baseC.start + baseC.dur : 17;
  const baseD = { start: baseDStart, dur: 4 };
  const ch3TotalFinishDay = Math.max(
    baseA.start + baseA.dur + delayDaysA - 1,
    baseB.start + baseB.dur - 1,
    baseC.start + baseC.dur - 1,
    baseD.start + baseD.dur - 1
  );
  const ch3OverlapConflict = !enableFSDependency && delayDaysA > 0;

  // Calculations for Ch4
  // Path 1 (Critical baseline): 12 + 8 = 20 days
  // Path 2 (Non-critical baseline): 6 + 5 = 11 days (9 days float)
  const path1Total = 20 + criticalDelay;
  const path2Total = 11 + nonCriticalDelay;
  const cpmProjectFinish = Math.max(path1Total, path2Total);
  const path2RemainingFloat = Math.max(0, path1Total - path2Total);
  const path2BecameCritical = path2Total >= path1Total && nonCriticalDelay > 0;

  // Calculations for Ch5 S-Curve
  const sCurvePoints = Array.from({ length: 7 }, (_, i) => {
    const day = i * 5; // 0, 5, 10, 15, 20, 25, 30
    // S-shaped planned curve
    const plannedTable = [0, 8, 22, 48, 76, 93, 100];
    const planned = plannedTable[i];
    let actual = planned;
    if (simScenario === 'delayed') {
      const delayedTable = [0, 5, 14, 28, 52, 82, 98];
      actual = delayedTable[i];
    } else if (simScenario === 'ahead') {
      const aheadTable = [0, 12, 32, 60, 84, 97, 100];
      actual = aheadTable[i];
    }
    return { day, planned, actual };
  });

  const interpolateCurve = (day: number, key: 'planned' | 'actual') => {
    const clamped = Math.max(0, Math.min(30, day));
    const idx = Math.floor(clamped / 5);
    if (idx >= 6) return sCurvePoints[6][key];
    const p0 = sCurvePoints[idx];
    const p1 = sCurvePoints[idx + 1];
    const ratio = (clamped - p0.day) / 5;
    return Math.round(p0[key] + (p1[key] - p0[key]) * ratio);
  };

  const simPlannedNow = interpolateCurve(simDay, 'planned');
  const simActualNow = interpolateCurve(simDay, 'actual');
  const simVarianceNow = simActualNow - simPlannedNow;

  // Quiz score
  const answeredCount = Object.keys(quizAnswers).length;
  const correctCount = QUIZ_ITEMS.filter((q) => quizAnswers[q.id] === q.correctIndex).length;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Page Hero & Top Navigation Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-700">甘特圖入門教學中心</span>
              <span aria-hidden="true">·</span>
              <span>零基礎圖解說明</span>
              <span aria-hidden="true">·</span>
              <span>含互動模擬實驗室</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
              從零開始學懂甘特圖：看圖、排程、抓延誤一次上手
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              完全沒學過專案管理也沒關係。這裡用生活化的比喻搭配可以親自點擊拖拉的互動圖表，帶你依序搞懂甘特圖怎麼看、工作怎麼拆、先後順序怎麼設，以及如何第一時間發現工程延誤。
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAllChapters((v) => !v)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {showAllChapters ? '切換為分章逐步閱讀' : '展開全部 6 章一次瀏覽'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateView('gantt')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <span>前往我的甘特圖實戰</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chapter Stepper Tabs */}
        {!showAllChapters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
            {CHAPTERS.map((ch) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChapter(ch.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-blue-50/70 border-blue-300 text-slate-900'
                      : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className={isActive ? 'font-bold text-blue-700' : 'text-slate-400'}>
                      {ch.num}
                    </span>
                    {isActive && (
                      <span className="text-3xs font-sans font-semibold text-blue-700">
                        閱讀中
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">{ch.title}</div>
                  <div className="text-3xs text-slate-500 truncate mt-0.5">{ch.subtitle}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 01: 甘特圖的核心結構                                        */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch1') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">01 · 核心結構解剖</div>
            <h2 className="text-xl font-bold text-slate-900">
              甘特圖到底是什麼？其實就是「把工作清單畫在時間軸上」
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              一百年前由工程師亨利·甘特（Henry Gantt）發明。你可以把它想像成一張結合「待辦清單」與「日曆」的總表：左邊列出要做什麼、上面列出日期、中間用橫條畫出每天要做哪一項。
            </p>
          </div>

          {/* Two-Zone Interactive Sandbox: Left Interactive Gantt Diagram, Right Concept Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Zone (60-65%): Clickable Annotated Mini Gantt */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  互動圖解：直接點擊下方圖表的任一區塊查看說明
                </span>
                <span className="text-3xs text-slate-500 font-mono">
                  點擊要素 · 即時反白解說
                </span>
              </div>

              {/* Interactive Mock Gantt Grid */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden select-none">
                {/* Header Row: Y-axis label + X-axis timeline */}
                <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedZone('yaxis')}
                    className={`col-span-4 px-3 py-2.5 text-left font-semibold border-r border-slate-200 transition-colors ${
                      selectedZone === 'yaxis'
                        ? 'bg-blue-100 text-blue-900 ring-2 ring-inset ring-blue-500'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    縱軸：WBS 工項清單
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedZone('xaxis')}
                    className={`col-span-8 grid grid-cols-6 text-center font-mono transition-colors ${
                      selectedZone === 'xaxis'
                        ? 'bg-blue-100 text-blue-900 ring-2 ring-inset ring-blue-500'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="py-2.5 border-r border-slate-100">第1週</span>
                    <span className="py-2.5 border-r border-slate-100">第2週</span>
                    <span className="py-2.5 border-r border-slate-100 font-bold text-red-600">
                      第3週(今)
                    </span>
                    <span className="py-2.5 border-r border-slate-100">第4週</span>
                    <span className="py-2.5 border-r border-slate-100">第5週</span>
                    <span className="py-2.5">第6週</span>
                  </button>
                </div>

                {/* Gantt Body with Today Line */}
                <div className="relative divide-y divide-slate-100 text-xs">
                  {/* Clickable Today Red Line */}
                  <button
                    type="button"
                    onClick={() => setSelectedZone('today')}
                    title="點擊查看「今日基準線」說明"
                    className={`absolute top-0 bottom-0 z-20 flex flex-col items-center cursor-pointer group ${
                      selectedZone === 'today' ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ left: '61%' }}
                  >
                    <span
                      className={`px-1.5 py-0.5 text-3xs font-bold rounded-b shadow-xs whitespace-nowrap ${
                        selectedZone === 'today'
                          ? 'bg-red-600 text-white ring-2 ring-red-300'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      今日線
                    </span>
                    <span className="w-0.5 flex-1 bg-red-500" />
                  </button>

                  {/* Row 1 */}
                  <div className="grid grid-cols-12 items-center min-h-[48px]">
                    <button
                      type="button"
                      onClick={() => setSelectedZone('yaxis')}
                      className={`col-span-4 px-3 py-2 text-left border-r border-slate-200 h-full flex items-center gap-1.5 transition-colors ${
                        selectedZone === 'yaxis' ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono text-slate-400">1.1</span>
                      <span className="font-medium text-slate-800 truncate">場地保護與拆除</span>
                    </button>
                    <div className="col-span-8 relative h-12 px-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedZone('bar')}
                        className={`relative h-7 rounded-md border overflow-hidden flex items-center transition-all ${
                          selectedZone === 'bar'
                            ? 'ring-2 ring-blue-600 border-blue-600'
                            : 'border-emerald-600'
                        }`}
                        style={{ width: '34%', marginLeft: '2%' }}
                      >
                        <span className="absolute inset-0 bg-emerald-500" />
                        <span className="relative z-10 px-2 text-3xs font-bold text-white whitespace-nowrap">
                          已完成 100%
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-12 items-center min-h-[48px]">
                    <button
                      type="button"
                      onClick={() => setSelectedZone('yaxis')}
                      className={`col-span-4 px-3 py-2 text-left border-r border-slate-200 h-full flex items-center gap-1.5 transition-colors ${
                        selectedZone === 'yaxis' ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono text-slate-400">1.2</span>
                      <span className="font-medium text-slate-800 truncate">水電與空調配管</span>
                    </button>
                    <div className="col-span-8 relative h-12 px-2 flex items-center">
                      <div
                        className={`relative h-7 rounded-md border overflow-hidden flex items-center bg-blue-50 ${
                          selectedZone === 'bar' || selectedZone === 'progress'
                            ? 'ring-2 ring-blue-600 border-blue-600'
                            : 'border-blue-500'
                        }`}
                        style={{ width: '44%', marginLeft: '26%' }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedZone('progress')}
                          title="點擊查看「進度填充條」說明"
                          className={`h-full transition-colors ${
                            selectedZone === 'progress' ? 'bg-blue-700' : 'bg-blue-500'
                          }`}
                          style={{ width: '60%' }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedZone('bar')}
                          className="absolute inset-0 flex items-center justify-between px-2 text-3xs font-bold"
                        >
                          <span className="text-white">進度 60%</span>
                          <span className="text-blue-900">剩 40%</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-12 items-center min-h-[48px]">
                    <button
                      type="button"
                      onClick={() => setSelectedZone('yaxis')}
                      className={`col-span-4 px-3 py-2 text-left border-r border-slate-200 h-full flex items-center gap-1.5 transition-colors ${
                        selectedZone === 'yaxis' ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono text-slate-400">1.3</span>
                      <span className="font-medium text-slate-800 truncate">木作與油漆裝修</span>
                    </button>
                    <div className="col-span-8 relative h-12 px-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedZone('bar')}
                        className={`h-7 rounded-md border bg-slate-100 flex items-center px-2 text-3xs font-semibold text-slate-700 transition-all ${
                          selectedZone === 'bar'
                            ? 'ring-2 ring-blue-600 border-blue-600'
                            : 'border-slate-300'
                        }`}
                        style={{ width: '34%', marginLeft: '54%' }}
                      >
                        尚未開始 0%
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Milestone */}
                  <div className="grid grid-cols-12 items-center min-h-[48px] bg-amber-50/30">
                    <button
                      type="button"
                      onClick={() => setSelectedZone('yaxis')}
                      className={`col-span-4 px-3 py-2 text-left border-r border-slate-200 h-full flex items-center gap-1.5 transition-colors ${
                        selectedZone === 'yaxis' ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono text-amber-700 font-bold">1.4</span>
                      <span className="font-bold text-amber-900 truncate">業主驗收點交 ◆</span>
                    </button>
                    <div className="col-span-8 relative h-12 px-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedZone('milestone')}
                        className="flex items-center gap-2 cursor-pointer"
                        style={{ marginLeft: '86%' }}
                      >
                        <span
                          className={`w-5 h-5 rotate-45 rounded-2xs flex items-center justify-center transition-all ${
                            selectedZone === 'milestone'
                              ? 'bg-amber-600 ring-4 ring-amber-200'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="text-3xs font-bold text-amber-900 whitespace-nowrap">
                          驗收日
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick element buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(
                  [
                    ['yaxis', '1. 縱軸清單'],
                    ['xaxis', '2. 橫軸時間'],
                    ['bar', '3. 任務長條'],
                    ['progress', '4. 進度填充'],
                    ['today', '5. 今日紅線'],
                    ['milestone', '6. 里程碑 ◆'],
                  ] as [AnatomyZone, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedZone(key)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      selectedZone === key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Zone (35-40%): Selected Zone Explanation Deck */}
            <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-xl p-5 bg-white space-y-4">
              <div className="space-y-4">
                <div className="text-xs font-mono text-blue-700 font-semibold">
                  圖表要素詳解
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {ANATOMY_DETAILS[selectedZone].title}
                </h3>

                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-900 mb-1">生活化比喻</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ANATOMY_DETAILS[selectedZone].analogy}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">核心定義</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ANATOMY_DETAILS[selectedZone].explanation}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">看圖實戰技巧</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ANATOMY_DETAILS[selectedZone].howToRead}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                口訣：左看「做什麼」，上看「哪一天」，條長看「幾天做完」，紅線看「今天趕得上嗎」。
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* CHAPTER 02: WBS 工作分解結構與權重                                  */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch2') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">02 · WBS 與權重觀念</div>
            <h2 className="text-xl font-bold text-slate-900">
              第一步怎麼開始？先把大工程切成「WBS 分項」，再用「預算權重」算總進度
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              面對一個大工程，直接排進度一定會亂。標準做法叫 <span className="font-semibold text-slate-900">WBS（工作分解結構）</span>：先把工程拆成幾個「大階段（分項工程）」，再把每個階段拆成可派工、可驗收的「小工項」。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* WBS Tree Guide */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">WBS 三層拆解法（樹狀編號邏輯）</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-900">第 1 層：整體專案（例如：辦公室整修工程）</div>
                <div className="pl-4 space-y-2 border-l border-slate-300">
                  <div>
                    <div className="font-semibold text-blue-800">第 2 層：1.0 前置準備與假設工程（分項工程）</div>
                    <div className="pl-4 mt-1 space-y-1 text-slate-600 font-mono">
                      <div>1.1 招標決標（可指派負責人與日期）</div>
                      <div>1.2 天花板拆除（可衡量完成 %）</div>
                      <div>1.3 空調水管保溫重新施作</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-800">第 2 層：2.0 主體裝修工程（分項工程）</div>
                    <div className="pl-4 mt-1 space-y-1 text-slate-600 font-mono">
                      <div>2.1 輕鋼架隔間工程</div>
                      <div>2.2 油漆工程</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <div className="font-bold text-slate-900">為什麼不能只用「工項數量」算總進度？</div>
                <p>
                  假設全案只有 2 件事：<span className="font-mono text-slate-900">「1. 買材料（10萬）」</span>和<span className="font-mono text-slate-900">「2. 全面施工（900萬）」</span>。買完材料時，工作件數完成了一半（50%），但實際花費與工程量其實才做了約 <span className="font-mono font-bold text-blue-700">1.1%</span>！
                </p>
                <p>
                  所以我們必須給每個工項設定「權重 %」（所有工項加總 = 100%），本系統支援<span className="font-semibold text-slate-900">直接依各工項預算佔比自動換算權重</span>，也可以手動微調。
                </p>
              </div>
            </div>

            {/* Interactive Lab 2: Budget -> Weight & Weighted Progress Simulator */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    互動實驗室：調整「預算金額」與「進度」，看權重如何影響總進度
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    系統公式：單項權重 = 該項預算 ÷ 全案總預算 × 100%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLabTasks([
                      { id: 't1', name: '1.1 天花板拆除工程', budget: 100, progress: 100 },
                      { id: 't2', name: '1.2 空調與水電配管', budget: 600, progress: 50 },
                      { id: 't3', name: '1.3 天花封板與燈具安裝', budget: 300, progress: 0 },
                    ])
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重設範例數值</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">工項名稱</th>
                      <th className="py-2.5 px-3 text-right">預算金額 (萬元)</th>
                      <th className="py-2.5 px-3 text-right">自動權重</th>
                      <th className="py-2.5 px-3 min-w-[160px]">實際進度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labTasks.map((t, idx) => {
                      const weight =
                        labTotalBudget > 0
                          ? Math.round((Math.max(0, t.budget) / labTotalBudget) * 1000) / 10
                          : 0;
                      return (
                        <tr key={t.id}>
                          <td className="py-3 px-3 font-medium text-slate-800">{t.name}</td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={t.budget}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setLabTasks((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, budget: val } : item))
                                );
                              }}
                              className="w-24 px-2 py-1 text-right font-mono tabular-nums border border-slate-200 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-blue-700">
                            {weight}%
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={t.progress}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLabTasks((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, progress: val } : item
                                    )
                                  );
                                }}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                              <span className="w-10 text-right font-mono tabular-nums font-semibold text-slate-800">
                                {t.progress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-500 mb-1">總預算分母</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {labTotalBudget.toLocaleString()} 萬元
                  </div>
                </div>
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-500 mb-1">若不設權重（單純平均）</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-400 line-through">
                    {labArithmeticAvg}%
                  </div>
                  <div className="text-3xs text-slate-500 mt-0.5">容易誤判真實進度</div>
                </div>
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <div className="text-blue-800 font-semibold mb-1">依權重加權總進度（正確）</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-blue-700">
                    {labWeightedProgress}%
                  </div>
                  <div className="text-3xs text-blue-700 mt-0.5">反映真正完成的工程價值</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* CHAPTER 03: 工項相依關係                                           */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch3') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">03 · 工項相依與順序邏輯</div>
            <h2 className="text-xl font-bold text-slate-900">
              工項之間有先後順序：什麼是「緊前工作（Predecessor）」？
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              施工現場講究工序，就像「還沒砌牆壁就不能油漆」。在甘特圖裡，我們會用線條把必須先完成的工項（緊前工作）連到下一項工作，確保前項延誤時，後續日期自動順延提醒。
            </p>
          </div>

          {/* 4 Dependency Types Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-blue-900">
                <span>FS（完成 → 開始）</span>
                <span className="font-mono text-3xs text-blue-700">最常用 90%</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                前項「全部完成」後，後項才能「開始」。例如：天花板拆除完成 → 才能開始配線。本系統預設採用 FS。
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900">SS（開始 → 開始）</div>
              <p className="text-slate-600 leading-relaxed">
                前項「開始」之後，後項才能跟著「開始」（同步推進）。例如：混凝土開始澆置後，養護準備作業也隨即開始。
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900">FF（完成 → 完成）</div>
              <p className="text-slate-600 leading-relaxed">
                前項必須先「完成」，後項才算可以「完成」。例如：所有測試報告撰寫完成，才能完成最終驗收。
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900">Lag（緩衝 / 延遲天數）</div>
              <p className="text-slate-600 leading-relaxed">
                前項完工後還得「多等幾天」才能做下一項。例如：水泥砂漿打底完成，需靜置乾燥 3 天才能貼磁磚。
              </p>
            </div>
          </div>

          {/* Interactive Lab 3: Delay Ripple Simulator */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span>互動模擬：試著讓「A. 拆除工程」延誤幾天，觀察後續連鎖反應</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  可切換「啟用 FS 相依連動」與「關閉連動」，體驗為什麼需要設定相依關係
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    A 工項延誤：{delayDaysA} 天
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={delayDaysA}
                    onChange={(e) => setDelayDaysA(Number(e.target.value))}
                    className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setEnableFSDependency((v) => !v)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    enableFSDependency
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  FS 相依連動：{enableFSDependency ? '已開啟' : '已關閉'}
                </button>
              </div>
            </div>

            {/* Mini Timeline Grid (Days 1 to 28) */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-3xs font-mono text-slate-500">
                <div className="col-span-3 px-3 py-2 font-sans font-semibold text-slate-700 border-r border-slate-200">
                  連鎖工項 (A → B → C → D)
                </div>
                <div className="col-span-9 grid grid-cols-7 text-center">
                  {['D1-4', 'D5-8', 'D9-12', 'D13-16', 'D17-20', 'D21-24', 'D25-28'].map(
                    (lbl) => (
                      <span key={lbl} className="py-2 border-r border-slate-100 last:border-r-0">
                        {lbl}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {[
                  {
                    label: 'A. 天花板拆除',
                    start: baseA.start,
                    dur: baseA.dur + delayDaysA,
                    color: delayDaysA > 0 ? 'bg-red-500' : 'bg-blue-600',
                    note: delayDaysA > 0 ? `原5天 + 延誤${delayDaysA}天` : '5天',
                  },
                  {
                    label: 'B. 水電消防配管',
                    start: baseB.start,
                    dur: baseB.dur,
                    color: ch3OverlapConflict ? 'bg-amber-500' : 'bg-sky-600',
                    note: `第${baseB.start}~${baseB.start + baseB.dur - 1}天`,
                  },
                  {
                    label: 'C. 輕鋼架封板',
                    start: baseC.start,
                    dur: baseC.dur,
                    color: 'bg-indigo-600',
                    note: `第${baseC.start}~${baseC.start + baseC.dur - 1}天`,
                  },
                  {
                    label: 'D. 油漆與驗收 ◆',
                    start: baseD.start,
                    dur: baseD.dur,
                    color: 'bg-emerald-600',
                    note: `第${baseD.start}~${baseD.start + baseD.dur - 1}天`,
                  },
                ].map((row) => {
                  const leftPct = ((row.start - 1) / 28) * 100;
                  const widthPct = (row.dur / 28) * 100;
                  return (
                    <div key={row.label} className="grid grid-cols-12 items-center min-h-[44px]">
                      <div className="col-span-3 px-3 py-2 border-r border-slate-200 font-medium text-slate-800 truncate">
                        {row.label}
                      </div>
                      <div className="col-span-9 relative h-10 px-1 flex items-center">
                        <div
                          className={`h-6 rounded ${row.color} text-white text-3xs font-mono flex items-center px-2 whitespace-nowrap transition-all duration-150`}
                          style={{
                            marginLeft: `${Math.min(85, leftPct)}%`,
                            width: `${Math.min(100 - leftPct, widthPct)}%`,
                          }}
                        >
                          {row.note}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outcome Banner */}
            <div
              className={`p-3.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                ch3OverlapConflict
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : delayDaysA > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {ch3OverlapConflict ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>
                  {ch3OverlapConflict
                    ? `排程衝突警告：關閉 FS 連動時，A 延誤到第 ${5 + delayDaysA} 天才拆完，但 B 第 6 天就強制進場，現場根本無法施工！`
                    : delayDaysA > 0
                    ? `連動結果：A 延誤 ${delayDaysA} 天，因設定了 FS 緊前關係，B、C、D 自動順延，全案完工日由第 20 天推遲至第 ${ch3TotalFinishDay} 天。`
                    : '正常狀態：四項工作接力完成，第 20 天準時完工驗收。'}
                </span>
              </div>
              <span className="font-mono font-bold">預定完工：第 {ch3TotalFinishDay} 天</span>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* CHAPTER 04: 里程碑與關鍵路徑                                        */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch4') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">04 · 里程碑與關鍵路徑 (CPM)</div>
            <h2 className="text-xl font-bold text-slate-900">
              時間有限時要盯緊哪一項？認識「里程碑」與「關鍵路徑」
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              工地同時有十幾組工班在動，但並不是每件事慢一天都會害工程延期。搞懂<span className="font-semibold text-slate-900">關鍵路徑（Critical Path）</span>與<span className="font-semibold text-slate-900">緩衝浮時（Float）</span>，就能把管理力氣花在最刀口上。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <Flag className="w-4 h-4 text-amber-600" />
                <span>里程碑（Milestone ◆）：重大驗收關卡</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                代表階段性的重要節點，例如「取得建照」、「結構封頂」、「消防會勘合格」、「業主點交」。在管理上會特別設定查驗條件，作為請款或進入下一階段的依據。
              </p>
            </div>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>關鍵路徑（CPM）：零緩衝的主動脈路線</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                整個專案從頭到尾最長的那條工作路線。這條路線上的任何工項延誤 1 天，最終完工日就一定會延後 1 天；相反的，不在關鍵路徑上的工項擁有「浮時（緩衝天數）」。
              </p>
            </div>
          </div>

          {/* Interactive Lab 4: Critical Path vs Float */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  互動實驗室：比較「關鍵路徑」與「非關鍵路徑」延誤的差別
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  試著先增加「路徑二（門窗訂製）」的延誤，看何時才會真正拖累總完工日
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCriticalDelay(0);
                  setNonCriticalDelay(0);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md"
              >
                <RotateCcw className="w-3 h-3" />
                <span>歸零重試</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-700">
                    路徑一（關鍵路徑，原工期 20 天 / 浮時 0 天）
                  </span>
                  <span className="font-mono font-bold text-red-700">+{criticalDelay} 天</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={criticalDelay}
                  onChange={(e) => setCriticalDelay(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="h-6 bg-slate-100 rounded overflow-hidden flex items-center">
                  <div
                    className="h-full bg-red-600 text-white font-mono text-3xs flex items-center px-2 transition-all"
                    style={{ width: `${Math.min(100, (path1Total / 30) * 100)}%` }}
                  >
                    主體結構與外牆 ({path1Total} 天)
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold ${
                      path2BecameCritical ? 'text-red-700' : 'text-blue-700'
                    }`}
                  >
                    路徑二（{path2BecameCritical ? '已轉為關鍵路徑！' : '非關鍵路徑，原工期 11 天'}）
                  </span>
                  <span className="font-mono font-bold text-blue-700">+{nonCriticalDelay} 天</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  value={nonCriticalDelay}
                  onChange={(e) => setNonCriticalDelay(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="h-6 bg-slate-100 rounded overflow-hidden flex items-center">
                  <div
                    className={`h-full text-white font-mono text-3xs flex items-center px-2 transition-all ${
                      path2BecameCritical ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (path2Total / 30) * 100)}%` }}
                  >
                    門窗與活動傢俱 ({path2Total} 天)
                  </div>
                  {!path2BecameCritical && path2RemainingFloat > 0 && (
                    <span className="px-2 text-3xs text-slate-500 font-mono whitespace-nowrap">
                      尚有緩衝 {path2RemainingFloat} 天
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-700">
                {path2BecameCritical
                  ? `注意：路徑二延誤達 ${nonCriticalDelay} 天，已吃光原本的 9 天緩衝浮時並反超路徑一，導致全案被迫延後！`
                  : criticalDelay > 0
                  ? `路徑一為關鍵路徑，延誤 ${criticalDelay} 天直接導致全案完工日延後至第 ${cpmProjectFinish} 天。`
                  : nonCriticalDelay > 0
                  ? `路徑二雖然延誤了 ${nonCriticalDelay} 天，但仍在 9 天緩衝浮時內，全案依舊準時於第 ${cpmProjectFinish} 天完工！`
                  : '兩條路徑皆準時，全案於第 20 天準時完工（路徑二擁有 9 天安全緩衝）。'}
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                全案預估完工：第 {cpmProjectFinish} 天
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* CHAPTER 05: S 曲線與進度判讀                                        */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch5') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">05 · S 曲線與狀態判讀</div>
            <h2 className="text-xl font-bold text-slate-900">
              如何向業主或主管報告進度？看懂「S 曲線（S-Curve）」與進度偏差
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              工程進度不是每天等速前進的：前期準備較慢、中期多工班同時施工累積最快、後期收尾驗收再放緩，畫成累計百分比曲線就會像一個英文字母 <span className="font-mono font-bold text-slate-900">S</span>。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* SVG S-Curve Visualizer */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg text-xs">
                  {(
                    [
                      ['ontrack', '正常依計畫施工'],
                      ['delayed', '前期落後趕工'],
                      ['ahead', '進度超前'],
                    ] as ['ontrack' | 'delayed' | 'ahead', string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSimScenario(key)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        simScenario === key
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-500">模擬今日：第 {simDay} 天</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={simDay}
                    onChange={(e) => setSimDay(Number(e.target.value))}
                    className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <svg viewBox="0 0 560 220" className="w-full h-52 overflow-visible">
                  {/* Horizontal Grid */}
                  {[0, 25, 50, 75, 100].map((pct) => {
                    const y = 190 - (pct / 100) * 160;
                    return (
                      <g key={pct}>
                        <line
                          x1="44"
                          y1={y}
                          x2="540"
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="36"
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] fill-slate-400 font-mono"
                        >
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Planned Curve (Dashed) */}
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    points={sCurvePoints
                      .map((p) => {
                        const x = 44 + (p.day / 30) * 496;
                        const y = 190 - (p.planned / 100) * 160;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Actual Curve up to simDay */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    points={[
                      ...sCurvePoints.filter((p) => p.day <= simDay),
                      { day: simDay, planned: simPlannedNow, actual: simActualNow },
                    ]
                      .map((p) => {
                        const x = 44 + (p.day / 30) * 496;
                        const y = 190 - (p.actual / 100) * 160;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Today Vertical Line */}
                  <line
                    x1={44 + (simDay / 30) * 496}
                    y1="20"
                    x2={44 + (simDay / 30) * 496}
                    y2="190"
                    stroke="#dc2626"
                    strokeWidth="1.5"
                  />

                  {/* Points at Today */}
                  <circle
                    cx={44 + (simDay / 30) * 496}
                    cy={190 - (simPlannedNow / 100) * 160}
                    r="4.5"
                    fill="#64748b"
                  />
                  <circle
                    cx={44 + (simDay / 30) * 496}
                    cy={190 - (simActualNow / 100) * 160}
                    r="5"
                    fill="#2563eb"
                  />

                  {/* X-Axis Labels */}
                  {sCurvePoints.map((p) => (
                    <text
                      key={p.day}
                      x={44 + (p.day / 30) * 496}
                      y="208"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-mono"
                    >
                      D{p.day}
                    </text>
                  ))}
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-4 text-slate-600">
                    <span>── 實線：實際累計進度</span>
                    <span>- - 虛線：預定計畫 S 曲線</span>
                    <span className="text-red-600 font-semibold">│ 紅線：今日進度切點</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Interpretation Deck */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500">預定進度</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-800 mt-0.5">
                    {simPlannedNow}%
                  </div>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <div className="text-blue-700">實際進度</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                    {simActualNow}%
                  </div>
                </div>
                <div
                  className={`p-3 border rounded-lg ${
                    simVarianceNow >= 0
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-red-50/70 border-red-200'
                  }`}
                >
                  <div className={simVarianceNow >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    進度偏差
                  </div>
                  <div
                    className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                      simVarianceNow >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {simVarianceNow >= 0 ? `+${simVarianceNow}%` : `${simVarianceNow}%`}
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-slate-900">系統四種工項燈號怎麼看？</div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-700">已完成：</span>
                      <span className="text-slate-600">實際進度達 100%。</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-blue-700">施工進行中：</span>
                      <span className="text-slate-600">已開工且偏差在正常範圍內。</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-700">落後延誤預警：</span>
                      <span className="text-slate-600">
                        已超過預定完工日卻未 100%，或實際進度落後預定進度達 15% 以上。
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700">未開始：</span>
                      <span className="text-slate-600">尚未到預定開工日且進度為 0%。</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* CHAPTER 06: 避坑指南、隨堂測驗與系統快速對照                        */}
      {/* ================================================================= */}
      {shouldRenderChapter('ch6') && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-8">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="text-xs font-mono text-blue-700 font-semibold">06 · 實務避坑、測驗與系統對照</div>
            <h2 className="text-xl font-bold text-slate-900">
              新手最容易踩的 4 個地雷、自我測驗與本系統工作流
            </h2>
          </div>

          {/* 4 Common Mistakes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              {
                num: '地雷 1',
                title: '項目切太碎或太粗',
                body: '每個工項最好控制在 3～30 天之間。切太碎每天改不完；只寫「全棟裝修 180 天」則完全看不出哪裡卡關。',
              },
              {
                num: '地雷 2',
                title: '漏設緊前工作相依',
                body: '沒綁定前項順序，前項延誤時後項不會順延，導致圖面看起來能準時完工，實際上根本撞期。',
              },
              {
                num: '地雷 3',
                title: '忘記填權重或預算',
                body: '沒設定權重時系統只能用項數平均，小項目做完就會誤以為進度很高。建議輸入預算金額讓系統自動算權重。',
              },
              {
                num: '地雷 4',
                title: '畫完圖就不更新',
                body: '甘特圖是「活的工具」。建議每週至少更新一次進度百分比，並搭配每日出工統計確認現場人數是否足夠。',
              },
            ].map((item) => (
              <div key={item.num} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="text-3xs font-mono font-bold text-red-600">{item.num}</div>
                <div className="font-bold text-slate-900">{item.title}</div>
                <p className="text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Interactive 4-Question Mini Quiz */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  新手觀念隨堂小測驗（共 {QUIZ_ITEMS.length} 題，立即對答案）
                </h3>
                <p className="text-xs text-slate-500">
                  目前作答：{answeredCount} / {QUIZ_ITEMS.length} 題 · 答對 {correctCount} 題
                </p>
              </div>
              {answeredCount > 0 && (
                <button
                  type="button"
                  onClick={() => setQuizAnswers({})}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重新作答</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUIZ_ITEMS.map((item, qIdx) => {
                const chosen = quizAnswers[item.id];
                const isAnswered = chosen !== undefined;
                const isCorrect = chosen === item.correctIndex;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 text-xs"
                  >
                    <div className="font-bold text-slate-900 leading-relaxed">
                      Q{qIdx + 1}. {item.question}
                    </div>
                    <div className="space-y-1.5">
                      {item.options.map((opt, optIdx) => {
                        const selected = chosen === optIdx;
                        const rightOpt = optIdx === item.correctIndex;
                        let cls =
                          'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                        if (isAnswered) {
                          if (rightOpt) {
                            cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold';
                          } else if (selected) {
                            cls = 'bg-red-50 border-red-300 text-red-900';
                          } else {
                            cls = 'bg-slate-50 border-slate-200 text-slate-400';
                          }
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((prev) => ({ ...prev, [item.id]: optIdx }))
                            }
                            className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between gap-2 transition-colors ${cls}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && rightOpt && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            {isAnswered && selected && !rightOpt && (
                              <X className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`p-2.5 rounded-lg text-3xs leading-relaxed border ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="font-bold mr-1">
                          {isCorrect ? '答對了！' : '觀念解析：'}
                        </span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Practical Workflow Mapping */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              在本系統操作建議順序（點擊卡片直接前往該頁面）
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {[
                {
                  step: '步驟 1',
                  view: 'table' as ActiveView,
                  icon: Layers,
                  title: '工項總表 (WBS)',
                  desc: '建立工項、輸入預算金額讓系統自動計算權重，並快速更新實際進度。',
                },
                {
                  step: '步驟 2',
                  view: 'gantt' as ActiveView,
                  icon: Calendar,
                  title: '甘特圖排程',
                  desc: '看橫條長度、設緊前相依連線、切換日/週/月縮放與檢視今日線。',
                },
                {
                  step: '步驟 3',
                  view: 'milestones' as ActiveView,
                  icon: Flag,
                  title: '管制節點中心',
                  desc: '集中追蹤查驗、執照、撥款與完工點交里程碑的倒數天數。',
                },
                {
                  step: '步驟 4',
                  view: 'analytics' as ActiveView,
                  icon: BarChart3,
                  title: '進度與 S 曲線',
                  desc: '產出預定 vs 實際 S 曲線圖表與各分項進度偏差統計。',
                },
                {
                  step: '步驟 5',
                  view: 'workforce' as ActiveView,
                  icon: Users,
                  title: '每日出工統計',
                  desc: '記錄每天各工班進場人數並自動生成趨勢與佔比圖表。',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.view}
                    type="button"
                    onClick={() => onNavigateView(card.view)}
                    className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-3xs font-mono text-blue-700 font-bold">
                        <span>{card.step}</span>
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="font-bold text-slate-900">{card.title}</div>
                      <p className="text-slate-600 leading-relaxed">{card.desc}</p>
                    </div>
                    <span className="text-3xs font-semibold text-blue-600 flex items-center gap-1">
                      前往頁面 <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Chapter Bottom Prev / Next Bar (when in single-chapter mode) */}
      {!showAllChapters && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentChapterIdx <= 0}
            onClick={() => {
              if (currentChapterIdx > 0) {
                setActiveChapter(CHAPTERS[currentChapterIdx - 1].id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>
              {currentChapterIdx > 0
                ? `上一章：${CHAPTERS[currentChapterIdx - 1].title}`
                : '已是第一章'}
            </span>
          </button>

          <div className="text-xs font-mono text-slate-500">
            第 {currentChapterIdx + 1} / {CHAPTERS.length} 章
          </div>

          {currentChapterIdx < CHAPTERS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setActiveChapter(CHAPTERS[currentChapterIdx + 1].id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <span>下一章：{CHAPTERS[currentChapterIdx + 1].title}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView('gantt')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <span>完成教學，前往甘特圖實戰</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
