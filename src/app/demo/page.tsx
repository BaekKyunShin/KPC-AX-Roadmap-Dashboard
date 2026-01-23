'use client';

import { useState } from 'react';
import Link from 'next/link';

// 샘플 데이터 (정적)
const SAMPLE_COMPANY = {
  name: '(주)샘플제조',
  industry: '제조업',
  size: '중견기업 (100-300명)',
};

const SAMPLE_MATRIX = [
  {
    task_id: '1',
    task_name: '품질-수입검사',
    beginner: { course_name: 'AI 기반 이미지 불량 분류 기초', recommended_hours: 16 },
    intermediate: { course_name: 'OpenCV를 활용한 자동 검사 시스템', recommended_hours: 24 },
    advanced: { course_name: '딥러닝 기반 품질 예측 모델 구축', recommended_hours: 32 },
  },
  {
    task_id: '2',
    task_name: '품질-불량원인분석',
    beginner: { course_name: '데이터 시각화로 불량 패턴 분석', recommended_hours: 12 },
    intermediate: { course_name: '통계 기반 불량 원인 추적', recommended_hours: 20 },
    advanced: { course_name: 'ML 기반 근본 원인 분석 시스템', recommended_hours: 36 },
  },
  {
    task_id: '3',
    task_name: '생산-작업지시',
    beginner: { course_name: 'AI 작업지시서 자동 생성', recommended_hours: 8 },
    intermediate: { course_name: '일정 최적화 도구 활용', recommended_hours: 16 },
    advanced: { course_name: 'AI 기반 생산 스케줄링', recommended_hours: 28 },
  },
  {
    task_id: '4',
    task_name: '생산-재고관리',
    beginner: { course_name: '수요 예측 기초', recommended_hours: 12 },
    intermediate: { course_name: '안전재고 최적화', recommended_hours: 20 },
    advanced: { course_name: 'AI 기반 자동 발주 시스템', recommended_hours: 32 },
  },
];

const SAMPLE_PBL = {
  course_name: 'AI 기반 이미지 불량 분류 기초',
  total_hours: 16,
  target_audience: '품질검사 담당자, 생산관리자',
  target_tasks: ['품질-수입검사', '품질-불량원인분석'],
  curriculum: [
    {
      module_name: '1주차: AI 이미지 인식 개요',
      hours: 4,
      description: 'AI 이미지 인식의 원리와 제조업 활용 사례 학습',
      practice: '불량 이미지 데이터셋 구축',
      tools: [
        { name: 'Google Colab', free_tier_info: '무료 (GPU 제한 있음)' },
        { name: 'Roboflow', free_tier_info: '무료 플랜 (1,000장/월)' },
      ],
    },
    {
      module_name: '2주차: 이미지 전처리 실습',
      hours: 4,
      description: '제조 현장 이미지 전처리 및 증강 기법',
      practice: '실제 검사 이미지로 전처리 파이프라인 구축',
      tools: [
        { name: 'OpenCV', free_tier_info: '오픈소스 (완전 무료)' },
        { name: 'Pillow', free_tier_info: '오픈소스 (완전 무료)' },
      ],
    },
    {
      module_name: '3주차: 분류 모델 학습',
      hours: 4,
      description: '사전학습 모델을 활용한 불량 분류 모델 학습',
      practice: '자사 불량 이미지로 분류 모델 Fine-tuning',
      tools: [
        { name: 'Teachable Machine', free_tier_info: '완전 무료' },
        { name: 'Hugging Face', free_tier_info: '무료 (커뮤니티 모델)' },
      ],
    },
    {
      module_name: '4주차: 현장 적용 및 평가',
      hours: 4,
      description: '모델 배포 및 성능 평가',
      practice: '실시간 검사 데모 구현 및 정확도 측정',
      tools: [
        { name: 'Streamlit', free_tier_info: '오픈소스 (완전 무료)' },
        { name: 'Gradio', free_tier_info: '오픈소스 (완전 무료)' },
      ],
    },
  ],
  expected_outcomes: [
    '불량 이미지 자동 분류 시스템 프로토타입 구축',
    '검사 시간 50% 단축',
    '누락 불량 감소로 고객 클레임 20% 감소',
  ],
  measurement_methods: [
    '분류 정확도 (Accuracy): 목표 90% 이상',
    '검사 소요 시간: Before/After 비교',
    '월별 누락 불량 건수 추적',
  ],
  prerequisites: [
    '검사 대상 제품 이미지 최소 500장',
    '양품/불량품 라벨링 데이터',
    'PC (인터넷 연결 필수)',
  ],
};

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'pbl' | 'courses'>('matrix');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                KPC AI 로드맵
              </Link>
              <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                데모 화면
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                로그인
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 안내 배너 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                데모 화면입니다
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                실제 AI 생성 결과가 아닌 샘플 데이터입니다. 실제 서비스를 이용하려면 회원가입 후 관리자 승인이 필요합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 기업 정보 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">기업 정보 (샘플)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">기업명</p>
              <p className="font-medium">{SAMPLE_COMPANY.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">업종</p>
              <p className="font-medium">{SAMPLE_COMPANY.industry}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">규모</p>
              <p className="font-medium">{SAMPLE_COMPANY.size}</p>
            </div>
          </div>
        </div>

        {/* 로드맵 */}
        <div className="bg-white shadow rounded-lg">
          {/* 탭 */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { key: 'matrix', label: 'NxM 매트릭스' },
                { key: 'pbl', label: 'PBL 최적 과정 (40시간)' },
                { key: 'courses', label: '과정 상세' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'matrix' | 'pbl' | 'courses')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 탭 내용 */}
          <div className="p-6">
            {activeTab === 'matrix' && <MatrixView />}
            {activeTab === 'pbl' && <PBLView />}
            {activeTab === 'courses' && <CoursesView />}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            우리 기업에 맞는 AI 교육 로드맵을 생성하고 싶으시다면?
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
          >
            지금 시작하기
          </Link>
        </div>
      </main>
    </div>
  );
}

// NxM 매트릭스 뷰
function MatrixView() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">세부직무별 AI 교육 로드맵</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                업무
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase bg-green-50">
                초급
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-yellow-600 uppercase bg-yellow-50">
                중급
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase bg-red-50">
                고급
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {SAMPLE_MATRIX.map((row) => (
              <tr key={row.task_id}>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  {row.task_name}
                </td>
                <td className="px-4 py-4 bg-green-50 text-center">
                  <div className="text-sm font-medium text-gray-900">{row.beginner.course_name}</div>
                  <div className="text-xs text-gray-500">{row.beginner.recommended_hours}시간</div>
                </td>
                <td className="px-4 py-4 bg-yellow-50 text-center">
                  <div className="text-sm font-medium text-gray-900">{row.intermediate.course_name}</div>
                  <div className="text-xs text-gray-500">{row.intermediate.recommended_hours}시간</div>
                </td>
                <td className="px-4 py-4 bg-red-50 text-center">
                  <div className="text-sm font-medium text-gray-900">{row.advanced.course_name}</div>
                  <div className="text-xs text-gray-500">{row.advanced.recommended_hours}시간</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// PBL 과정 뷰
function PBLView() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{SAMPLE_PBL.course_name}</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            PBL 최적 과정
          </span>
        </div>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>총 {SAMPLE_PBL.total_hours}시간</span>
          <span>대상: {SAMPLE_PBL.target_audience}</span>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">대상 업무</h4>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PBL.target_tasks.map((task, idx) => (
            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              {task}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">커리큘럼</h4>
        <div className="space-y-3">
          {SAMPLE_PBL.curriculum.map((module, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{module.module_name}</span>
                <span className="text-sm text-gray-500">{module.hours}시간</span>
              </div>
              <p className="text-sm text-gray-600">{module.description}</p>
              <p className="mt-2 text-sm text-blue-600">실습: {module.practice}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {module.tools.map((tool, tidx) => (
                  <span
                    key={tidx}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                    title={tool.free_tier_info}
                  >
                    {tool.name} ({tool.free_tier_info})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">기대 효과</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {SAMPLE_PBL.expected_outcomes.map((outcome, idx) => (
              <li key={idx}>{outcome}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">측정 방법</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {SAMPLE_PBL.measurement_methods.map((method, idx) => (
              <li key={idx}>{method}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">준비물</h4>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          {SAMPLE_PBL.prerequisites.map((prereq, idx) => (
            <li key={idx}>{prereq}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 과정 상세 뷰
function CoursesView() {
  const allCourses = SAMPLE_MATRIX.flatMap(row => [
    { ...row.beginner, level: 'BEGINNER', target_task: row.task_name },
    { ...row.intermediate, level: 'INTERMEDIATE', target_task: row.task_name },
    { ...row.advanced, level: 'ADVANCED', target_task: row.task_name },
  ]);

  const levelColors: Record<string, string> = {
    BEGINNER: 'bg-green-100 text-green-800',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
    ADVANCED: 'bg-red-100 text-red-800',
  };

  const levelLabels: Record<string, string> = {
    BEGINNER: '초급',
    INTERMEDIATE: '중급',
    ADVANCED: '고급',
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 과정 상세</h3>
      <div className="space-y-4">
        {allCourses.map((course, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{course.course_name}</h4>
                <p className="text-sm text-gray-500">대상 업무: {course.target_task}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${levelColors[course.level]}`}>
                  {levelLabels[course.level]}
                </span>
                <span className="text-sm text-gray-500">{course.recommended_hours}시간</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              * 실제 서비스에서는 커리큘럼, 실습/과제, 사용 도구(무료 전제), 기대효과, 측정방법, 준비물 등이 상세히 제공됩니다.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
