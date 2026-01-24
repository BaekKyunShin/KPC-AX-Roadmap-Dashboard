'use client';

import { useState, useMemo } from 'react';
import AssignmentForm from './AssignmentForm';

interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  rank: number;
  rationale?: string;
  candidate?: {
    id: string;
    name: string;
    email: string;
    consultant_profile?: Record<string, unknown>;
  };
}

interface ReassignmentSectionProps {
  projectData: {
    assigned_consultant?: {
      id: string;
      name: string;
      email: string;
    } | null;
    status: string;
  };
  projectId: string;
  recommendations: Recommendation[];
  latestAssignment?: {
    assignment_reason: string;
  };
}

export default function ReassignmentSection({
  projectData,
  projectId,
  recommendations,
  latestAssignment,
}: ReassignmentSectionProps) {
  const [showReassignForm, setShowReassignForm] = useState(false);

  // candidate 정보가 있는 추천만 필터링
  const validRecommendations = useMemo(() =>
    recommendations.filter((r): r is Recommendation & { candidate: { id: string; name: string; email: string } } =>
      !!r.candidate
    ),
    [recommendations]
  );

  if (!projectData.assigned_consultant) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">컨설턴트 배정</h2>
        <AssignmentForm
          projectId={projectId}
          recommendations={validRecommendations}
        />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">컨설턴트 배정</h2>

      <div className="p-4 bg-green-50 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-800">
              현재 배정: <span className="font-bold">{projectData.assigned_consultant.name}</span>
            </p>
            <p className="text-sm text-green-600">{projectData.assigned_consultant.email}</p>
            {latestAssignment && (
              <p className="text-sm text-green-600 mt-1">
                배정 사유: {latestAssignment.assignment_reason}
              </p>
            )}
          </div>
          {!['FINALIZED'].includes(projectData.status) && (
            <button
              type="button"
              onClick={() => setShowReassignForm(!showReassignForm)}
              className="px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50"
            >
              {showReassignForm ? '취소' : '재배정'}
            </button>
          )}
        </div>
      </div>

      {showReassignForm && (
        <div className="border-t pt-4">
          <p className="text-sm text-orange-600 mb-4">
            다른 컨설턴트로 재배정합니다. 기존 배정은 이력으로 보관됩니다.
          </p>
          <AssignmentForm
            projectId={projectId}
            recommendations={validRecommendations}
          />
        </div>
      )}
    </div>
  );
}
