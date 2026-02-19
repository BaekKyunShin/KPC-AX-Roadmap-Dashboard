'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  Sparkles,
  Play,
  Settings2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pencil,
  Trash2,
  Copy,
  ArrowUpDown,
  Eye,
  FlaskConical,
  X,
  Plus,
  GripHorizontal,
} from 'lucide-react';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const PROJECT_INFO = {
  company: 'LG에너지솔루션',
  industry: '전자/반도체',
  version: 'v2 (DRAFT)',
};

const TASKS = ['품질검사 데이터 분석', '보고서 작성 자동화', '재고 관리 최적화'];
const LEVEL_LABELS = ['초급', '중급', '고급'];
const LEVEL_KEYS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// 과정 카드 데이터 (매트릭스)
interface CourseCard {
  id: string;
  name: string;
  hours: number;
  modules: number;
  tools: string[];
  isValid: boolean;
  validationErrors?: string[];
  isPbl?: boolean;
}

const MATRIX: Record<string, Record<string, CourseCard[]>> = {
  '품질검사 데이터 분석': {
    BEGINNER: [
      {
        id: 'c1',
        name: 'AI 기반 품질검사 입문',
        hours: 24,
        modules: 4,
        tools: ['ChatGPT', 'Google Sheets'],
        isValid: true,
      },
    ],
    INTERMEDIATE: [
      {
        id: 'c2',
        name: '데이터 시각화와 이상 탐지',
        hours: 32,
        modules: 5,
        tools: ['ChatGPT', 'Looker Studio', 'Python Basics'],
        isValid: true,
        isPbl: true,
      },
    ],
    ADVANCED: [
      {
        id: 'c3',
        name: '예측 품질 모델 구축',
        hours: 40,
        modules: 6,
        tools: ['ChatGPT', 'Google Colab', 'AutoML'],
        isValid: true,
      },
    ],
  },
  '보고서 작성 자동화': {
    BEGINNER: [
      {
        id: 'c4',
        name: 'AI 비서 활용 보고서 작성',
        hours: 20,
        modules: 3,
        tools: ['ChatGPT', 'Notion AI'],
        isValid: true,
      },
    ],
    INTERMEDIATE: [
      {
        id: 'c5',
        name: '자동 보고서 파이프라인',
        hours: 28,
        modules: 4,
        tools: ['ChatGPT', 'Google Apps Script'],
        isValid: false,
        validationErrors: ['총 시간 초과: 28h > 권장 24h'],
      },
    ],
    ADVANCED: [],
  },
  '재고 관리 최적화': {
    BEGINNER: [
      {
        id: 'c6',
        name: '스프레드시트 재고 관리 기초',
        hours: 16,
        modules: 3,
        tools: ['Google Sheets', 'ChatGPT'],
        isValid: true,
      },
    ],
    INTERMEDIATE: [],
    ADVANCED: [
      {
        id: 'c7',
        name: 'AI 수요 예측 시스템',
        hours: 36,
        modules: 5,
        tools: ['ChatGPT', 'Google Colab', 'Streamlit'],
        isValid: true,
      },
    ],
  },
};

// AI 채팅 기록
const AI_CHAT_HISTORY = [
  {
    role: 'user' as const,
    text: '보고서 작성 자동화에 고급 과정을 추가해줘',
  },
  {
    role: 'assistant' as const,
    text: '보고서 작성 자동화의 고급 과정으로 "AI 기반 경영 리포트 자동 생성" (32h, 5모듈)을 제안합니다. 도구: ChatGPT, Google Apps Script, Gamma. 추가하시겠습니까?',
  },
  {
    role: 'user' as const,
    text: '시간을 28시간으로 줄여줘',
  },
  {
    role: 'assistant' as const,
    text: '28시간으로 조정하면 "API 연동 실습" 모듈이 4h→2h로 축소됩니다. 해당 모듈의 실습 깊이가 줄어들 수 있습니다. 진행할까요?',
  },
];

// 시뮬레이션 비교 데이터
const SIMULATION_BEFORE = { totalHours: 196, courses: 7, avgPerTask: 65.3 };
const SIMULATION_AFTER = { totalHours: 224, courses: 8, avgPerTask: 74.7 };

// 검증 결과
const VALIDATION_RESULTS = [
  { type: 'success' as const, message: '모든 과정이 40시간 이내' },
  { type: 'success' as const, message: '업무별 과정 매핑 완료' },
  { type: 'warning' as const, message: '"자동 보고서 파이프라인" 28h — 권장 24h 초과' },
  { type: 'success' as const, message: 'PBL 과정 선정 완료' },
  { type: 'success' as const, message: '사용 도구 모두 무료 범위 확인' },
];

// ── 컴포넌트 ──────────────────────────────────

function CourseCardComponent({
  course,
  isDragging,
}: {
  course: CourseCard;
  isDragging?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'shadow-lg ring-2 ring-primary/30 scale-[1.02]'
          : 'hover:shadow-md hover:border-gray-300'
      } ${!course.isValid ? 'border-amber-300 bg-amber-50/30' : ''} ${
        course.isPbl ? 'ring-1 ring-blue-200' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-300" />
      </div>

      {/* 호버 시 액션 버튼 */}
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="rounded p-1 hover:bg-gray-100" title="편집">
          <Pencil className="h-3 w-3 text-gray-400" />
        </button>
        <button className="rounded p-1 hover:bg-gray-100" title="복제">
          <Copy className="h-3 w-3 text-gray-400" />
        </button>
        <button className="rounded p-1 hover:bg-red-50" title="삭제">
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>

      <div className="pl-3">
        <div className="flex items-start gap-2 mb-2">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight flex-1 pr-16">
            {course.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 bg-gray-50 text-gray-600 border-gray-200"
          >
            <Clock className="mr-0.5 h-3 w-3" />
            {course.hours}h
          </Badge>
          <span className="text-[10px] text-gray-400">{course.modules}개 모듈</span>
          {course.isPbl && (
            <Badge className="text-[10px] px-1.5 bg-blue-100 text-blue-700 border-blue-200">
              PBL
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {course.tools.map((tool) => (
            <span
              key={tool}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              {tool}
            </span>
          ))}
        </div>

        {!course.isValid && course.validationErrors && (
          <div className="mt-2 flex items-start gap-1 rounded bg-amber-50 px-2 py-1 border border-amber-200">
            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <span className="text-[10px] text-amber-700">
              {course.validationErrors[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────

export default function InteractiveCanvasMockup() {
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [showSimulation, setShowSimulation] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [timeMultiplier, setTimeMultiplier] = useState(1.0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="인터랙티브 로드맵 캔버스"
        description={`${PROJECT_INFO.company} — ${PROJECT_INFO.version}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={showSimulation ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowSimulation(!showSimulation)}
            >
              <FlaskConical className="h-4 w-4" />
              시뮬레이션
            </Button>
            <Button
              variant={showAiPanel ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAiPanel(!showAiPanel)}
            >
              <Sparkles className="h-4 w-4" />
              AI 어시스턴트
            </Button>
          </div>
        }
      />

      {/* ── 툴바 ── */}
      <Card>
        <CardContent className="py-2 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="되돌리기">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="다시하기">
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="mx-2 h-4 w-px bg-gray-200" />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="확대">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="축소">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="맞춤">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <div className="mx-2 h-4 w-px bg-gray-200" />
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                과정 추가
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                자동 정렬
              </Button>
            </div>

            {/* 시간 슬라이더 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">시간 조절</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8 text-right">
                  {(timeMultiplier * 100).toFixed(0)}%
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={timeMultiplier}
                  onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
                  className="w-24 h-1 accent-primary"
                />
              </div>
              <div className="mx-2 h-4 w-px bg-gray-200" />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="설정">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 시뮬레이션 패널 (토글) ── */}
      {showSimulation && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">시뮬레이션 모드</span>
                <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                  PREVIEW
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50">
                  <Eye className="h-3 w-3" />
                  비교 보기
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700">
                  <Play className="h-3 w-3" />
                  적용
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500 mb-1">변경 전</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{SIMULATION_BEFORE.totalHours}h</p>
                    <p className="text-[10px] text-gray-400">총 시간</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{SIMULATION_BEFORE.courses}</p>
                    <p className="text-[10px] text-gray-400">과정 수</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{SIMULATION_BEFORE.avgPerTask}h</p>
                    <p className="text-[10px] text-gray-400">업무 평균</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                <p className="text-xs text-purple-600 mb-1">변경 후 (시뮬레이션)</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-purple-900">{SIMULATION_AFTER.totalHours}h</p>
                    <p className="text-[10px] text-purple-500">총 시간 (+{SIMULATION_AFTER.totalHours - SIMULATION_BEFORE.totalHours}h)</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-900">{SIMULATION_AFTER.courses}</p>
                    <p className="text-[10px] text-purple-500">과정 수 (+1)</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-900">{SIMULATION_AFTER.avgPerTask}h</p>
                    <p className="text-[10px] text-purple-500">업무 평균</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 메인 영역: 캔버스 + AI 사이드바 ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 캔버스 매트릭스 */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-gray-50 border-b border-r p-3 text-left text-sm font-medium text-gray-500 min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <GripHorizontal className="h-4 w-4 text-gray-300" />
                          업무 / 레벨
                        </div>
                      </th>
                      {LEVEL_LABELS.map((label, i) => (
                        <th
                          key={label}
                          className="border-b border-r last:border-r-0 p-3 text-center text-sm font-medium min-w-[240px]"
                          style={{
                            backgroundColor:
                              i === 0 ? '#F0FDF4' : i === 1 ? '#EFF6FF' : '#FDF4FF',
                            color:
                              i === 0 ? '#15803D' : i === 1 ? '#1D4ED8' : '#7E22CE',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TASKS.map((task) => (
                      <tr key={task} className="border-b last:border-b-0">
                        <td className="sticky left-0 z-10 bg-white border-r p-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="h-4 w-4 text-gray-200 cursor-grab" />
                            <span className="text-sm font-medium text-gray-900">
                              {task}
                            </span>
                          </div>
                        </td>
                        {LEVEL_KEYS.map((level) => {
                          const courses = MATRIX[task]?.[level] || [];
                          return (
                            <td
                              key={level}
                              className="border-r last:border-r-0 p-3 align-top min-h-[120px]"
                            >
                              <div className="space-y-2 min-h-[100px]">
                                {courses.length > 0 ? (
                                  courses.map((course) => (
                                    <CourseCardComponent
                                      key={course.id}
                                      course={{
                                        ...course,
                                        hours: Math.round(course.hours * timeMultiplier),
                                      }}
                                    />
                                  ))
                                ) : (
                                  <div className="flex items-center justify-center h-[100px] rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer group">
                                    <div className="text-center">
                                      <Plus className="h-5 w-5 text-gray-300 group-hover:text-primary/60 mx-auto mb-1 transition-colors" />
                                      <span className="text-xs text-gray-300 group-hover:text-primary/60 transition-colors">
                                        과정 추가
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── 검증 패널 ── */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                실시간 검증
                <Badge variant="outline" className="ml-auto text-[10px] bg-green-50 text-green-700 border-green-200">
                  {VALIDATION_RESULTS.filter((v) => v.type === 'success').length}/{VALIDATION_RESULTS.length} 통과
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {VALIDATION_RESULTS.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                      result.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {result.type === 'success' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    {result.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── AI 사이드바 ── */}
        {showAiPanel && (
          <div className="w-full lg:w-[340px] lg:flex-shrink-0">
            <Card className="h-[calc(100vh-280px)] sticky top-20 flex flex-col">
              <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    AI 어시스턴트
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowAiPanel(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {/* 빠른 제안 버튼 */}
              <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50/50">
                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide font-medium">
                  빠른 제안
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '빈 셀 채우기',
                    '시간 최적화',
                    '난이도 조정',
                    'PBL 추천',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="rounded-full border bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* 채팅 히스토리 */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {AI_CHAT_HISTORY.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-400">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </div>
                      )}
                      {msg.text}
                      {msg.role === 'assistant' && i === AI_CHAT_HISTORY.length - 1 && (
                        <div className="flex gap-1.5 mt-2">
                          <button className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors">
                            적용
                          </button>
                          <button className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50 transition-colors">
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 입력 영역 */}
              <div className="flex-shrink-0 border-t px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="과정을 수정하거나 질문하세요..."
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  />
                  <Button size="sm" className="h-8 w-8 p-0">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-gray-300 mt-1.5 text-center">
                  AI가 로드맵을 분석하여 수정 제안을 합니다
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
