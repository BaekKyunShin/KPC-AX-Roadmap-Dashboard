interface PendingApprovalCardProps {
  userName: string;
}

export default function PendingApprovalCard({ userName }: PendingApprovalCardProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-yellow-800">승인 대기 중입니다</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              안녕하세요, <strong>{userName}</strong>님!
            </p>
            <p className="mt-2">
              회원가입은 완료되었습니다. 관리자의 승인이 완료되면 AI 로드맵 생성 기능을 이용하실 수
              있습니다.
            </p>
            <p className="mt-4 text-xs">
              승인 관련 문의는 운영 담당자에게 연락해 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
