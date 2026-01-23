'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SelfAssessmentTemplate } from '@/types/database';
import { setActiveTemplate, duplicateTemplate } from '../actions';

interface TemplateWithUsage extends SelfAssessmentTemplate {
  usage_count: number;
}

interface TemplateListProps {
  templates: TemplateWithUsage[];
}

export default function TemplateList({ templates }: TemplateListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetActive = async (templateId: string) => {
    if (!confirm('이 템플릿을 활성화하시겠습니까? 기존 활성 템플릿은 비활성화됩니다.')) {
      return;
    }

    setLoading(templateId);
    setError(null);

    const result = await setActiveTemplate(templateId);
    if (!result.success) {
      setError(result.error || '활성화에 실패했습니다.');
    }
    setLoading(null);
    router.refresh();
  };

  const handleDuplicate = async (templateId: string) => {
    setLoading(templateId);
    setError(null);

    const result = await duplicateTemplate(templateId);
    if (!result.success) {
      setError(result.error || '복제에 실패했습니다.');
    }
    setLoading(null);
    router.refresh();
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">템플릿 없음</h3>
        <p className="mt-1 text-sm text-gray-500">새 템플릿을 생성해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                버전
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                템플릿 이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                문항 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용 현황
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id} className={template.is_active ? 'bg-green-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    v{template.version}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <Link
                      href={`/ops/templates/${template.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {template.name}
                    </Link>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                        {template.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.questions?.length || 0}개
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.usage_count > 0 ? (
                    <span className="text-blue-600">{template.usage_count}건 사용</span>
                  ) : (
                    <span className="text-gray-400">미사용</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {template.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      활성
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      비활성
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(template.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link
                    href={`/ops/templates/${template.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    상세
                  </Link>
                  {!template.is_active && (
                    <button
                      onClick={() => handleSetActive(template.id)}
                      disabled={loading === template.id}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      {loading === template.id ? '처리중...' : '활성화'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    disabled={loading === template.id}
                    className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    복제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">템플릿 관리 안내</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>활성화된 템플릿이 새로운 자가진단에 사용됩니다.</li>
                <li>이미 사용 중인 템플릿을 수정하면 새 버전으로 저장됩니다.</li>
                <li>기존 자가진단은 작성 당시의 템플릿 버전을 유지합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
