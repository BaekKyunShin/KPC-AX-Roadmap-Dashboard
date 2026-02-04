'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { PageHeader } from '@/components/ui/page-header';
import { COMPANY_SIZE_OPTIONS } from '@/lib/constants/company-size';
import { showErrorToast, showSuccessToast, scrollToElement } from '@/lib/utils';
import { PROJECT_INDUSTRIES, SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';
import { TagInput } from '@/components/ui/tag-input';
import { createProject } from '../actions';

export default function NewProjectPage() {
  const router = useRouter();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subIndustries, setSubIndustries] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    // 세부 업종을 JSON 문자열로 추가
    formData.set('sub_industries', JSON.stringify(subIndustries));
    const result = await createProject(formData);

    if (result.success && result.data?.projectId) {
      showSuccessToast('프로젝트 생성 완료', '프로젝트가 성공적으로 생성되었습니다.');
      router.push(`/ops/projects/${result.data.projectId}`);
    } else {
      const errorMessage = result.error || '프로젝트 생성에 실패했습니다.';
      setError(errorMessage);

      // Toast 알림 + 스크롤
      showErrorToast('프로젝트 생성 실패', errorMessage);
      scrollToElement(formContainerRef);
    }

    setIsLoading(false);
  }

  return (
    <div ref={formContainerRef} className="max-w-2xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title="새 프로젝트 생성"
          description="기업 기본 정보를 입력하여 프로젝트를 생성합니다."
          backLink={{ href: '/ops/projects', label: '프로젝트 목록으로' }}
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* 회사명, 기업 규모 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              회사명 *
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="company_size" className="block text-sm font-medium text-gray-700">
              기업 규모 *
            </label>
            <select
              id="company_size"
              name="company_size"
              required
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">선택하세요</option>
              {COMPANY_SIZE_OPTIONS.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 업종 + 세부 업종 그룹 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
              업종 *
            </label>
            <select
              id="industry"
              name="industry"
              required
              className="mt-1 block w-full md:w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">선택하세요</option>
              {PROJECT_INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* 세부 업종 */}
          <div className="pl-4 border-l-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700">
              세부 업종 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <p className="text-sm text-gray-500 mt-1 mb-2">
              더 구체적인 업종을 입력해주세요. (예: 반도체, 디스플레이, 자동차 부품, 식품 등)
            </p>
            <TagInput
              value={subIndustries}
              onChange={setSubIndustries}
              placeholder="세부 업종 입력 후 Enter 또는 추가 버튼"
              maxTags={SUB_INDUSTRY_CONSTRAINTS.maxTags}
              maxLength={SUB_INDUSTRY_CONSTRAINTS.maxLength}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">담당자 정보</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                담당자명 *
              </label>
              <input
                id="contact_name"
                name="contact_name"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                담당자 이메일 *
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                담당자 연락처
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="company_address" className="block text-sm font-medium text-gray-700">
            회사 주소
          </label>
          <input
            id="company_address"
            name="company_address"
            type="text"
            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="customer_comment" className="block text-sm font-medium text-gray-700">
            고객 코멘트/요청사항
          </label>
          <textarea
            id="customer_comment"
            name="customer_comment"
            rows={4}
            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="고객이 전달한 추가 요청사항이나 코멘트를 입력하세요."
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/ops/projects"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '생성 중...' : '프로젝트 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
