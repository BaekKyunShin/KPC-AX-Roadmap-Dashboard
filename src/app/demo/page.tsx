'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapTabKey } from '@/types/roadmap-ui';
import {
  SAMPLE_COMPANY,
  SAMPLE_COURSES,
  SAMPLE_MATRIX,
  SAMPLE_PBL,
} from '@/lib/data/demo-sample';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('matrix');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-purple-600">
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              {ROADMAP_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
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
            {activeTab === 'matrix' && <RoadmapMatrix matrix={SAMPLE_MATRIX} />}
            {activeTab === 'courses' && <CoursesList courses={SAMPLE_COURSES} />}
            {activeTab === 'pbl' && <PBLCourseView course={SAMPLE_PBL} />}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            우리 기업에 맞는 AI 교육 로드맵을 생성하고 싶으시다면?
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-lg font-medium"
          >
            지금 시작하기
          </Link>
        </div>
      </main>
    </div>
  );
}
