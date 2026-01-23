'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCase } from '../actions';

const INDUSTRIES = [
  '제조업',
  '서비스업',
  '유통/물류',
  'IT/소프트웨어',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '교육',
  '공공/정부',
  '기타',
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10명' },
  { value: '11-50', label: '11-50명' },
  { value: '51-100', label: '51-100명' },
  { value: '101-500', label: '101-500명' },
  { value: '500+', label: '500명 이상' },
];

export default function NewCasePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCase(formData);

    if (result.success && result.data?.caseId) {
      router.push(`/ops/cases/${result.data.caseId}`);
    } else {
      setError(result.error || '케이스 생성에 실패했습니다.');
    }

    setIsLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/ops/cases" className="text-sm text-gray-500 hover:text-gray-700">
          ← 케이스 목록으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">새 케이스 생성</h1>
        <p className="mt-1 text-sm text-gray-500">기업 기본 정보를 입력하여 케이스를 생성합니다.</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
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
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            업종 *
          </label>
          <select
            id="industry"
            name="industry"
            required
            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">선택하세요</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
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
            {COMPANY_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
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
            href="/ops/cases"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '생성 중...' : '케이스 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
