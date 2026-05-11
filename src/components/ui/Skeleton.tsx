/**
 * 스켈레톤 로딩 UI 컴포넌트
 *
 * 데이터 로딩 중 콘텐츠 구조를 미리 보여주어 체감 로딩 시간을 줄이고
 * 레이아웃 시프트를 방지합니다.
 */

// ============================================================================
// 타입 정의
// ============================================================================

interface SkeletonProps {
  className?: string;
}

interface TableSkeletonProps {
  /** 표시할 행 개수 */
  rows?: number;
}

/** 테이블 컬럼 설정 */
interface TableColumnConfig {
  header: string;
  width: string;
}

/** 테이블 설정 (컬럼 + 최소 너비) */
interface TableConfig {
  columns: TableColumnConfig[];
  minWidth: string;
}

/** 스켈레톤 바 props */
interface SkeletonBarProps {
  height: string;
  width: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

// ============================================================================
// 스타일 상수
// ============================================================================

/** 스켈레톤 바 스타일 (shimmer 애니메이션 적용) */
const SKELETON_BAR = {
  primary: 'animate-shimmer rounded',
  secondary: 'animate-shimmer rounded opacity-70',
} as const;

/** 테이블 공통 스타일 */
const TABLE_STYLES = {
  wrapper: 'relative w-full overflow-x-auto bg-white shadow rounded-lg',
  table: 'w-full table-fixed caption-bottom text-sm divide-y divide-gray-200',
  thead: 'bg-gray-50',
  theadMuted: 'bg-muted/50',
  tbody: 'bg-white divide-y divide-gray-200',
  /** 실제 TableHead 컴포넌트와 동일한 스타일 */
  th: 'px-6 py-3 text-center align-middle text-sm font-medium text-gray-500 uppercase tracking-wider',
  /** 실제 TableCell 컴포넌트와 동일한 스타일 */
  td: 'px-6 py-4 align-top text-center text-sm',
} as const;

/** 카드 공통 스타일 */
const CARD_STYLES = {
  base: 'bg-white shadow rounded-lg',
  padding: {
    default: 'p-6',
    compact: 'p-4',
  },
} as const;

/** 프로젝트 워크플로우 단계 수 (MiniStepper와 일치) */
const PROJECT_WORKFLOW_STEP_COUNT = 6;

// ============================================================================
// 테이블별 설정
// ============================================================================

/** OPS 프로젝트 테이블 설정 (ops/projects) */
const PROJECT_TABLE: TableConfig = {
  columns: [
    { header: '기업명', width: 'min-w-[180px]' },
    { header: '업종', width: 'min-w-[80px]' },
    { header: '진행 상태', width: 'min-w-[180px]' },
    { header: '담당 컨설턴트', width: 'min-w-[100px]' },
    { header: '프로젝트 생성일', width: 'min-w-[110px]' },
    { header: '작업', width: 'min-w-[70px]' },
  ],
  minWidth: 'min-w-[900px]',
};

/** 컨설턴트 프로젝트 테이블 설정 (consultant/projects) */
const CONSULTANT_PROJECT_TABLE: TableConfig = {
  columns: [
    { header: '기업명', width: 'min-w-[140px]' },
    { header: '업종', width: 'min-w-[100px]' },
    { header: '규모', width: 'min-w-[80px]' },
    { header: '상태', width: 'min-w-[100px]' },
    { header: '배정일', width: 'min-w-[100px]' },
    { header: '작업', width: 'min-w-[80px]' },
  ],
  minWidth: 'min-w-[700px]',
};

/** 감사로그 테이블 설정 (ops/audit) */
const AUDIT_LOG_TABLE: TableConfig = {
  columns: [
    { header: '시간', width: 'min-w-[100px]' },
    { header: '사용자', width: 'min-w-[140px]' },
    { header: '액션', width: 'min-w-[120px]' },
    { header: '대상', width: 'min-w-[140px]' },
    { header: '상태', width: 'min-w-[80px]' },
    { header: '상세', width: 'min-w-[180px]' },
  ],
  minWidth: 'min-w-[800px]',
};

/** 사용자 관리 테이블 설정 (ops/users) */
const USER_TABLE: TableConfig = {
  columns: [
    { header: '사용자', width: 'min-w-[160px]' },
    { header: '역할', width: 'min-w-[120px]' },
    { header: '상태', width: 'min-w-[80px]' },
    { header: '프로필', width: 'min-w-[100px]' },
    { header: '가입일', width: 'min-w-[100px]' },
    { header: '관리', width: 'min-w-[100px]' },
  ],
  minWidth: 'min-w-[700px]',
};

/** 쿼터 관리 테이블 설정 (ops/quota) */
const QUOTA_TABLE: TableConfig = {
  columns: [
    { header: '사용자', width: 'min-w-[140px]' },
    { header: '역할', width: 'min-w-[100px]' },
    { header: '월간 사용량', width: 'min-w-[160px]' },
    { header: '일일 한도', width: 'min-w-[100px]' },
    { header: '월간 한도', width: 'min-w-[100px]' },
    { header: '한도 설정', width: 'min-w-[100px]' },
  ],
  minWidth: 'min-w-[800px]',
};

/** 템플릿 테이블 설정 (ops/templates) — 실제 TemplateList TABLE_COLUMNS와 동일 비율 */
const TEMPLATE_TABLE: TableConfig = {
  columns: [
    { header: '버전', width: 'w-[10%]' },
    { header: '템플릿 이름', width: 'w-[28%]' },
    { header: '문항 수', width: 'w-[11%]' },
    { header: '사용 현황', width: 'w-[15%]' },
    { header: '상태', width: 'w-[11%]' },
    { header: '생성일', width: 'w-[18%]' },
    { header: '', width: 'w-[7%]' },
  ],
  minWidth: 'min-w-[750px]',
};

// ============================================================================
// 헬퍼 함수
// ============================================================================

/** 지정된 개수만큼 요소를 생성 */
function renderItems(count: number, renderItem: (index: number) => React.ReactNode) {
  return Array.from({ length: count }, (_, i) => renderItem(i));
}

// ============================================================================
// 공통 내부 컴포넌트
// ============================================================================

/** 테이블 헤더 렌더링 */
function TableSkeletonHeader({
  columns,
  theadClassName = TABLE_STYLES.thead,
}: {
  columns: TableColumnConfig[];
  theadClassName?: string;
}) {
  return (
    <thead className={theadClassName}>
      <tr>
        {columns.map((col) => (
          <th key={col.header} className={`${TABLE_STYLES.th} ${col.width}`}>
            {col.header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** 테이블 래퍼 */
function TableSkeletonWrapper({
  minWidth,
  children,
}: {
  minWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div className={TABLE_STYLES.wrapper}>
      <table className={`${TABLE_STYLES.table} ${minWidth}`}>{children}</table>
    </div>
  );
}

/** MiniStepper 스켈레톤 (워크플로우 단계 스텝퍼) */
function MiniStepperSkeleton() {
  const lastStepIndex = PROJECT_WORKFLOW_STEP_COUNT - 1;

  return (
    <div className="flex flex-col gap-1 items-center">
      <div className="flex items-center gap-0.5">
        {renderItems(PROJECT_WORKFLOW_STEP_COUNT, (i) => (
          <div key={i} className="flex items-center">
            <div className={`h-2.5 w-2.5 rounded-full ${SKELETON_BAR.primary}`} />
            {i < lastStepIndex && <div className={`h-0.5 w-2 ${SKELETON_BAR.secondary}`} />}
          </div>
        ))}
      </div>
      <div className={`h-3 w-20 ${SKELETON_BAR.secondary}`} />
    </div>
  );
}

/** 스켈레톤 바 (텍스트/배지 등) */
function SkeletonBar({ height, width, variant = 'primary', className = '' }: SkeletonBarProps) {
  return <div className={`${height} ${width} ${SKELETON_BAR[variant]} ${className}`} />;
}

// ============================================================================
// 기본 스켈레톤 컴포넌트
// ============================================================================

/** 기본 스켈레톤 컴포넌트 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`${SKELETON_BAR.primary} ${className}`} />;
}

/** 테이블 행 스켈레톤 (단일 행) */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {renderItems(columns, (i) => (
        <td key={i} className={TABLE_STYLES.td}>
          <SkeletonBar height="h-4" width="w-3/4" className="mx-auto" />
        </td>
      ))}
    </tr>
  );
}

// ============================================================================
// 테이블 스켈레톤 컴포넌트
// ============================================================================

/** OPS 프로젝트 목록 테이블 스켈레톤 */
export function ProjectTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = PROJECT_TABLE;

  return (
    <ResponsiveTableSkeleton>
      <TableSkeletonWrapper minWidth={minWidth}>
        <TableSkeletonHeader columns={columns} />
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 기업명: 아이콘 + 회사명/이메일 */}
              <td className={`${TABLE_STYLES.td} ${columns[0].width}`}>
                <div className="flex items-center gap-3 justify-center">
                  <div className={`h-9 w-9 shrink-0 rounded-lg ${SKELETON_BAR.primary}`} />
                  <div className="text-left">
                    <SkeletonBar height="h-4" width="w-28" className="mb-2" />
                    <SkeletonBar height="h-3" width="w-36" variant="secondary" />
                  </div>
                </div>
              </td>
              {/* 업종 */}
              <td className={`${TABLE_STYLES.td} ${columns[1].width}`}>
                <SkeletonBar height="h-4" width="w-16" className="mx-auto" />
              </td>
              {/* 진행 상태: MiniStepper */}
              <td className={`${TABLE_STYLES.td} ${columns[2].width}`}>
                <div className="flex justify-center">
                  <MiniStepperSkeleton />
                </div>
              </td>
              {/* 담당 컨설턴트 */}
              <td className={`${TABLE_STYLES.td} ${columns[3].width}`}>
                <SkeletonBar height="h-4" width="w-20" className="mx-auto" />
              </td>
              {/* 프로젝트 생성일 */}
              <td className={`${TABLE_STYLES.td} ${columns[4].width}`}>
                <SkeletonBar height="h-4" width="w-24" className="mx-auto" />
              </td>
              {/* 작업 */}
              <td className={`${TABLE_STYLES.td} ${columns[5].width}`}>
                <SkeletonBar height="h-4" width="w-14" className="mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

/** 컨설턴트 담당 프로젝트 테이블 스켈레톤 */
export function ConsultantProjectTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = CONSULTANT_PROJECT_TABLE;

  return (
    <ResponsiveTableSkeleton mobileCard={<ConsultantProjectCardSkeleton />}>
      <TableSkeletonWrapper minWidth={minWidth}>
        <TableSkeletonHeader columns={columns} theadClassName={TABLE_STYLES.theadMuted} />
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 기업명 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-24" className="mx-auto" />
              </td>
              {/* 업종 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mx-auto" />
              </td>
              {/* 규모 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-14" className="mx-auto" />
              </td>
              {/* 상태: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-20" className="mx-auto" />
              </td>
              {/* 배정일 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-20" className="mx-auto" />
              </td>
              {/* 작업 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

/** 감사로그 테이블 스켈레톤 */
export function AuditLogTableSkeleton({ rows = 10 }: TableSkeletonProps) {
  const { columns, minWidth } = AUDIT_LOG_TABLE;

  return (
    <ResponsiveTableSkeleton mobileCards={4} mobileCard={<AuditLogCardSkeleton />}>
      <TableSkeletonWrapper minWidth={minWidth}>
        <TableSkeletonHeader columns={columns} />
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 시간: 날짜 + 시간 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-3" width="w-20" className="mb-1 mx-auto" />
                <SkeletonBar height="h-3" width="w-16" variant="secondary" className="mx-auto" />
              </td>
              {/* 사용자: 이름 + 이메일 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mb-1 mx-auto" />
                <SkeletonBar height="h-3" width="w-24" variant="secondary" className="mx-auto" />
              </td>
              {/* 액션: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-20" className="mx-auto" />
              </td>
              {/* 대상: 타입 + ID */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mb-1 mx-auto" />
                <SkeletonBar height="h-3" width="w-20" variant="secondary" className="mx-auto" />
              </td>
              {/* 상태: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-12" className="mx-auto" />
              </td>
              {/* 상세 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-24" className="mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

/** 사용자 관리 테이블 스켈레톤 */
export function UserTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = USER_TABLE;

  return (
    <ResponsiveTableSkeleton mobileCard={<UserCardSkeleton />}>
      <TableSkeletonWrapper minWidth={minWidth}>
        <TableSkeletonHeader columns={columns} />
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 사용자: 이름 + 이메일 */}
              <td className={TABLE_STYLES.td}>
                <div className="text-left pl-14">
                  <SkeletonBar height="h-4" width="w-20" className="mb-1" />
                  <SkeletonBar height="h-3" width="w-32" variant="secondary" />
                </div>
              </td>
              {/* 역할: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-24" className="mx-auto" />
              </td>
              {/* 상태: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-12" className="mx-auto" />
              </td>
              {/* 프로필 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mx-auto" />
              </td>
              {/* 가입일 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-20" className="mx-auto" />
              </td>
              {/* 관리 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-12" className="mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

/** 쿼터 관리 테이블 스켈레톤 */
export function QuotaTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = QUOTA_TABLE;

  return (
    <ResponsiveTableSkeleton>
      <TableSkeletonWrapper minWidth={minWidth}>
        <TableSkeletonHeader columns={columns} />
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 사용자: 이름 + 이메일 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-20" className="mb-1 mx-auto" />
                <SkeletonBar height="h-3" width="w-28" variant="secondary" className="mx-auto" />
              </td>
              {/* 역할: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-6" width="w-20" className="mx-auto" />
              </td>
              {/* 월간 사용량: 수치 + 프로그레스바 */}
              <td className={TABLE_STYLES.td}>
                <div className="inline-block">
                  <SkeletonBar height="h-4" width="w-20" className="mb-1" />
                  <SkeletonBar height="h-2" width="w-28" variant="secondary" />
                </div>
              </td>
              {/* 일일 한도 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-12" className="mx-auto" />
              </td>
              {/* 월간 한도 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-12" className="mx-auto" />
              </td>
              {/* 한도 설정 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-10" className="mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

/** 템플릿 테이블 스켈레톤 */
export function TemplateTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = TEMPLATE_TABLE;

  return (
    <ResponsiveTableSkeleton>
      <TableSkeletonWrapper minWidth={minWidth}>
        {/* 버전(pl-8), 이름(text-left) 등 커스텀 정렬이 필요하므로 직접 렌더링 */}
        <thead className={TABLE_STYLES.thead}>
          <tr>
            <th className={`${TABLE_STYLES.th} ${columns[0].width} pl-8`}>{columns[0].header}</th>
            <th className={`${TABLE_STYLES.th} ${columns[1].width} text-left`}>{columns[1].header}</th>
            {columns.slice(2).map((col) => (
              <th key={col.header || 'actions'} className={`${TABLE_STYLES.th} ${col.width}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={TABLE_STYLES.tbody}>
          {renderItems(rows, (i) => (
            <tr key={i}>
              {/* 버전: 배지 */}
              <td className={`${TABLE_STYLES.td} ${columns[0].width} pl-8`}>
                <SkeletonBar height="h-5" width="w-10" />
              </td>
              {/* 템플릿 이름 + 설명 (좌측 정렬) */}
              <td className={`${TABLE_STYLES.td} ${columns[1].width} text-left`}>
                <SkeletonBar height="h-4" width="w-28" className="mb-1" />
                <SkeletonBar height="h-3" width="w-36" variant="secondary" />
              </td>
              {/* 문항 수 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-10" className="mx-auto" />
              </td>
              {/* 사용 현황 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-16" className="mx-auto" />
              </td>
              {/* 상태: 배지 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-5" width="w-12" className="mx-auto" />
              </td>
              {/* 생성일 */}
              <td className={TABLE_STYLES.td}>
                <SkeletonBar height="h-4" width="w-20" className="mx-auto" />
              </td>
              {/* 작업: DropdownMenu 아이콘 버튼 */}
              <td className={TABLE_STYLES.td}>
                <div className="flex justify-end mr-4">
                  <SkeletonBar height="h-8" width="w-8" className="rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableSkeletonWrapper>
    </ResponsiveTableSkeleton>
  );
}

// ============================================================================
// 템플릿 폼/미리보기 스켈레톤
// ============================================================================

/** 질문 아이템 스켈레톤 (TemplateForm의 QuestionItem과 동일 구조) */
function QuestionItemSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/** 템플릿 폼 스켈레톤 (기본 정보 카드 + 질문 목록 카드 + 하단 버튼) */
export function TemplateFormSkeleton({ questionCount = 1 }: { questionCount?: number }) {
  return (
    <div className="space-y-6">
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-4`}>
        <Skeleton className="h-6 w-20" />
        <div>
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-4`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        {renderItems(questionCount, (i) => (
          <QuestionItemSkeleton key={i} />
        ))}
      </div>

      <div className="flex justify-end space-x-3">
        <Skeleton className="h-10 w-16 rounded-md" />
        <Skeleton className="h-10 w-16 rounded-md" />
      </div>
    </div>
  );
}

/** 템플릿 미리보기 스켈레톤 (TemplatePreview와 동일 구조) */
export function TemplatePreviewSkeleton() {
  return (
    <div className={`${CARD_STYLES.base} overflow-hidden`}>
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
        <div className="mt-2 flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {renderItems(3, (groupIndex) => (
        <div key={groupIndex} className="p-4 border-b border-gray-200 last:border-0">
          <div className="flex items-center mb-3">
            <Skeleton className="h-2 w-2 rounded-full mr-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            {renderItems(2, (qIndex) => (
              <div key={qIndex} className="bg-gray-50 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-16 ml-2" />
                </div>
                <div className="mt-2 flex items-center space-x-1">
                  {renderItems(5, (n) => (
                    <Skeleton key={n} className="h-8 w-8 rounded-full" />
                  ))}
                  <Skeleton className="h-3 w-16 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 px-6 py-4 border-t border-blue-100">
        <Skeleton className="h-4 w-24 mb-2" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 모바일 카드 스켈레톤 (실제 *MobileCard 컴포넌트 구조 미러)
// ============================================================================

/** 헤더(이름+배지)·그리드 행 묶음·푸터를 그려내는 카드 베이스 */
function MobileCardSkeletonBase({
  header,
  rows,
  footer,
}: {
  header: React.ReactNode;
  rows: Array<[string, string]>; // [라벨 width, 값 width]
  footer?: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">{header}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([labelWidth, valueWidth], i) => (
          <div key={i} className="contents">
            <SkeletonBar height="h-3.5" width={labelWidth} variant="secondary" />
            <SkeletonBar height="h-3.5" width={valueWidth} />
          </div>
        ))}
      </div>
      {footer && <div className="pt-2 border-t">{footer}</div>}
    </div>
  );
}

/** UserMobileCard 스켈레톤 (이름+역할 배지 / 이메일·상태·가입일 그리드 / 프로필+관리) */
export function UserCardSkeleton() {
  return (
    <MobileCardSkeletonBase
      header={
        <>
          <SkeletonBar height="h-4" width="w-24" />
          <SkeletonBar height="h-6" width="w-20" variant="secondary" />
        </>
      }
      rows={[
        ['w-12', 'w-32'],
        ['w-16', 'w-12'],
        ['w-12', 'w-20'],
      ]}
      footer={
        <div className="flex items-center justify-between">
          <SkeletonBar height="h-4" width="w-20" variant="secondary" />
          <SkeletonBar height="h-8" width="w-8" variant="secondary" />
        </div>
      }
    />
  );
}

/** AuditMobileCard 스켈레톤 (action 배지+성공/실패 / 날짜 / 사용자·이메일·대상 그리드) */
export function AuditLogCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <SkeletonBar height="h-6" width="w-20" />
        <SkeletonBar height="h-6" width="w-12" variant="secondary" />
      </div>
      <SkeletonBar height="h-3" width="w-32" variant="secondary" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {[
          ['w-12', 'w-20'],
          ['w-12', 'w-32'],
          ['w-12', 'w-24'],
        ].map(([l, v], i) => (
          <div key={i} className="contents">
            <SkeletonBar height="h-3.5" width={l} variant="secondary" />
            <SkeletonBar height="h-3.5" width={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** ProjectMobileCard 스켈레톤 (회사명+트랙배지 / 상태배지 / 업종·규모·배정일 / 상세보기) */
export function ConsultantProjectCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SkeletonBar height="h-4" width="w-28" />
          <SkeletonBar height="h-5" width="w-12" variant="secondary" />
        </div>
        <SkeletonBar height="h-6" width="w-20" variant="secondary" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {[
          ['w-12', 'w-20'],
          ['w-12', 'w-16'],
          ['w-12', 'w-24'],
        ].map(([l, v], i) => (
          <div key={i} className="contents">
            <SkeletonBar height="h-3.5" width={l} variant="secondary" />
            <SkeletonBar height="h-3.5" width={v} />
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t">
        <SkeletonBar height="h-4" width="w-16" variant="secondary" />
      </div>
    </div>
  );
}

// ============================================================================
// 반응형 테이블 스켈레톤 래퍼 (데스크톱: 테이블 / 모바일: 카드)
// ============================================================================

/** 테이블 스켈레톤의 반응형 래퍼 — md 이상에서 테이블, 미만에서 카드 표시 */
function ResponsiveTableSkeleton({
  mobileCards = 3,
  mobileCard,
  children,
}: {
  mobileCards?: number;
  /** 실제 페이지의 *MobileCard 와 같은 구조의 카드 스켈레톤 (지정하지 않으면 generic 3줄) */
  mobileCard?: React.ReactNode;
  children: React.ReactNode;
}) {
  const fallbackCard = (
    <div className="border border-gray-200 rounded-lg p-4 space-y-2">
      <SkeletonBar height="h-4" width="w-3/4" />
      <SkeletonBar height="h-3" width="w-1/2" variant="secondary" />
      <SkeletonBar height="h-3" width="w-1/3" variant="secondary" />
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{children}</div>
      <div className="md:hidden space-y-3">
        {renderItems(mobileCards, (i) => (
          <div key={i}>{mobileCard ?? fallbackCard}</div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// 기타 스켈레톤 컴포넌트
// ============================================================================

/** 카드 스켈레톤 */
export function CardSkeleton() {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default}`}>
      <SkeletonBar height="h-4" width="w-1/4" className="mb-4" />
      <div className="space-y-3">
        <SkeletonBar height="h-4" width="w-full" />
        <SkeletonBar height="h-4" width="w-5/6" />
        <SkeletonBar height="h-4" width="w-4/6" />
      </div>
    </div>
  );
}

/** 상세 페이지 스켈레톤 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBar height="h-4" width="w-24" className="mb-2" />
          <SkeletonBar height="h-8" width="w-48" />
        </div>
        <div className="flex space-x-3">
          <SkeletonBar height="h-10" width="w-24" />
          <SkeletonBar height="h-10" width="w-24" />
        </div>
      </div>

      {/* 정보 카드들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderItems(2, (cardIndex) => (
          <div key={cardIndex} className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default}`}>
            <SkeletonBar height="h-5" width="w-32" className="mb-4" />
            <div className="space-y-3">
              {renderItems(4, (i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonBar height="h-4" width="w-20" />
                  <SkeletonBar height="h-4" width="w-32" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 통계 카드 스켈레톤 */
export function StatsCardSkeleton() {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.compact}`}>
      <SkeletonBar height="h-4" width="w-20" className="mb-2" />
      <SkeletonBar height="h-8" width="w-16" />
    </div>
  );
}

/** 페이지네이션 스켈레톤 */
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <SkeletonBar height="h-4" width="w-32" />
      <div className="flex space-x-2">
        <SkeletonBar height="h-8" width="w-16" />
        <SkeletonBar height="h-8" width="w-16" />
      </div>
    </div>
  );
}

// ============================================================================
// 로드맵 스켈레톤 컴포넌트 (Step 6/6.5 재설계 반영)
// ============================================================================
//
// 실제 UI 구조 (ConsultantRoadmapClient):
//   PageHeader (제목 + 다운로드/확정 버튼)
//   └─ VersionSelector 바 (sticky)
//   └─ RegenerateAccordion (수정 요청 아코디언)
//   └─ 버전 카드
//        ├─ 헤더: 버전 뱃지 + revision prompt
//        ├─ RoadmapOverviewSummary (Ⅰ-1 수립 필요성 + Ⅰ-3 수립 결과)
//        ├─ diagnosis_summary
//        ├─ 탭 (sticky, variant 별: Roadmap 3 / PBL 5)
//        └─ 첫 탭(Ⅰ. 개요) 컨텐츠: RoadmapOverviewTabSkeleton / PBLOverviewTabSkeleton
// ============================================================================

/** 로드맵 개요 요약 스켈레톤 (Step 6.5 — Ⅰ-1 수립 필요성 + Ⅰ-3 수립 결과) */
function RoadmapOverviewSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {renderItems(2, (i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBar height="h-3.5" width="w-4" />
            <SkeletonBar height="h-4" width="w-28" />
          </div>
          <SkeletonBar height="h-3.5" width="w-full" variant="secondary" />
          <SkeletonBar height="h-3.5" width="w-5/6" variant="secondary" />
          <SkeletonBar height="h-3.5" width="w-2/3" variant="secondary" />
        </div>
      ))}
    </div>
  );
}

/**
 * 버전 선택 + 다운로드 행 스켈레톤.
 *
 * 실제 RoadmapResultClient/PBLResultClient 의 PageHeader 아래 줄을 미러한다:
 * `<div flex-col gap-3 sm:flex-row sm:justify-between>`
 *   좌: VersionSelector(min-w-[240px]) + "버전 N" h2 + Badge + (consultant DRAFT) 최종 확정 버튼
 *   우: DownloadButtonGroup (PDF/XLSX/HWPX × 3, outline size-sm)
 *
 * 카드/배경/sticky 없이 평탄한 flex 행이다.
 */
function VersionActionsRowSkeleton({
  showFinalizeButton = false,
}: { showFinalizeButton?: boolean } = {}) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        {/* VersionSelector — Select trigger (min-w-[240px], h-9) */}
        <SkeletonBar height="h-9" width="w-60" />
        {/* "버전 N" h2 (text-sm font-semibold) */}
        <SkeletonBar height="h-4" width="w-12" variant="secondary" />
        {/* VersionStatusBadge */}
        <SkeletonBar height="h-6" width="w-14" variant="secondary" />
        {/* (consultant DRAFT) 최종 확정 버튼 */}
        {showFinalizeButton && <SkeletonBar height="h-9" width="w-24" variant="secondary" />}
      </div>
      {/* DownloadButtonGroup (3 outline size-sm 버튼) */}
      <div className="flex gap-2">
        <SkeletonBar height="h-9" width="w-20" />
        <SkeletonBar height="h-9" width="w-20" />
        <SkeletonBar height="h-9" width="w-20" />
      </div>
    </div>
  );
}

/** RegenerateAccordion 스켈레톤 (수정 요청 아코디언 접힘 상태) */
function RegenerateAccordionSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <SkeletonBar height="h-4" width="w-4" />
          <SkeletonBar height="h-4" width="w-28" />
        </div>
        <SkeletonBar height="h-4" width="w-4" variant="secondary" />
      </div>
    </div>
  );
}

type FirstTabContent = 'roadmap-overview' | 'pbl-overview';

/** Roadmap 결과 첫 탭(Ⅰ. 개요): Ⅰ-1 수립필요성 + Ⅰ-2 주요활동(6컬럼 테이블 3행) + Ⅰ-3 결과 2-컬럼 카드 */
function RoadmapOverviewTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-3`}>
        <SkeletonBar height="h-5" width="w-32" />
        <div className="space-y-2">
          <SkeletonBar height="h-3.5" width="w-full" variant="secondary" />
          <SkeletonBar height="h-3.5" width="w-11/12" variant="secondary" />
          <SkeletonBar height="h-3.5" width="w-9/12" variant="secondary" />
        </div>
      </div>
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-3`}>
        <SkeletonBar height="h-5" width="w-28" />
        <div className="overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 border-b border-gray-200 pb-2">
            {renderItems(6, (i) => (
              <SkeletonBar key={i} height="h-4" width="w-full" variant="secondary" />
            ))}
          </div>
          {renderItems(3, (row) => (
            <div key={row} className="grid grid-cols-6 gap-2 py-2 border-b border-gray-100">
              {renderItems(6, (col) => (
                <SkeletonBar key={col} height="h-4" width="w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderItems(2, (i) => (
          <div key={i} className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-2`}>
            <SkeletonBar height="h-4" width="w-24" />
            <SkeletonBar height="h-3.5" width="w-full" variant="secondary" />
            <SkeletonBar height="h-3.5" width="w-10/12" variant="secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** PBL 결과 첫 탭(Ⅰ. 개요): 신청서 자동표출 FormTable(2-컬럼 4행) + 훈련과정 개요 카드 2개 */
function PBLOverviewTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-3`}>
        <SkeletonBar height="h-5" width="w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {renderItems(8, (i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <SkeletonBar height="h-4" width="w-20" variant="secondary" />
              <SkeletonBar height="h-4" width="w-32" />
            </div>
          ))}
        </div>
      </div>
      {renderItems(2, (i) => (
        <div key={i} className={`${CARD_STYLES.base} ${CARD_STYLES.padding.default} space-y-2`}>
          <SkeletonBar height="h-5" width="w-28" />
          <SkeletonBar height="h-3.5" width="w-full" variant="secondary" />
          <SkeletonBar height="h-3.5" width="w-11/12" variant="secondary" />
        </div>
      ))}
    </div>
  );
}

/**
 * ResultTabs 스켈레톤 (탭 개수·첫 탭 컨텐츠 variant 분기).
 *
 * 실제 ResultTabs 는 카드 컨테이너 없이 평탄하게 렌더되며, 탭 바는 화면 너비를
 * 가로지르는 sticky bar (`sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8`)이다.
 * 탭 바 우측에는 "모두 펼치기/접기" 토글 버튼이 있다.
 */
function ResultTabsSkeleton({
  tabCount,
  firstTabContent,
}: {
  tabCount: 3 | 5;
  firstTabContent: FirstTabContent;
}) {
  return (
    <div>
      {/* 탭 바 (sticky, 화면 가로지르는 -mx 인셋) */}
      <div
        className="sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b"
        data-testid="skeleton-version-card-tabs"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 gap-2">
          <nav className="flex gap-1">
            {renderItems(tabCount, (i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-md ${
                  i === 0 ? 'bg-muted' : ''
                } flex-shrink-0`}
              >
                <SkeletonBar
                  height="h-4"
                  width="w-20"
                  variant={i === 0 ? 'primary' : 'secondary'}
                />
              </div>
            ))}
          </nav>
          {/* "모두 펼치기/접기" 토글 버튼 */}
          <SkeletonBar height="h-8" width="w-20" variant="secondary" />
        </div>
      </div>

      {/* 첫 탭(Ⅰ. 개요) 컨텐츠 — variant 별 분기 */}
      <div className="pt-6 space-y-5">
        {firstTabContent === 'roadmap-overview' ? (
          <RoadmapOverviewTabSkeleton />
        ) : (
          <PBLOverviewTabSkeleton />
        )}
      </div>
    </div>
  );
}

/**
 * 로드맵/PBL 결과 페이지 스켈레톤 공통 레이아웃 (variant 분기).
 *
 * 실제 페이지의 PageContainer + RoadmapResultClient/PBLResultClient 구조를 미러:
 *   <max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8>
 *     ├ PageHeader (title + description, 우측 actions 없음)
 *     ├ VersionActionsRow (VersionSelector + 버전N + Badge + (DRAFT) 확정 / DownloadGroup)
 *     ├ (consultant) RegenerateAccordion
 *     └ ResultTabs (카드 없이 평탄, sticky 탭 바 + 첫 탭 컨텐츠)
 */
function RoadmapPageSkeletonBase({
  tabCount,
  firstTabContent,
  showRegenerateAccordion = false,
  showFinalizeButton = false,
}: {
  tabCount: 3 | 5;
  firstTabContent: FirstTabContent;
  showRegenerateAccordion?: boolean;
  /** consultant 측만 DRAFT 일 때 "최종 확정" 버튼 노출 가능. */
  showFinalizeButton?: boolean;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* PageHeader: 제목 + description (우측 actions 없음 — 다운로드는 아래 행에 위치) */}
      <div>
        <SkeletonBar height="h-7" width="w-48" />
        <div data-testid="skeleton-page-description" className="mt-1">
          <SkeletonBar height="h-3.5" width="w-72" variant="secondary" />
        </div>
      </div>

      {/* 버전 선택 + 다운로드 행 (sticky·카드 X, 그냥 flex 행) */}
      <VersionActionsRowSkeleton showFinalizeButton={showFinalizeButton} />

      {/* 수정 요청 아코디언 (컨설턴트 전용 + versions > 0 일 때만 — 로딩 중엔 가시화) */}
      {showRegenerateAccordion && (
        <div data-testid="skeleton-regenerate-accordion">
          <RegenerateAccordionSkeleton />
        </div>
      )}

      {/* ResultTabs (평탄 구조, 카드 없음) */}
      <ResultTabsSkeleton tabCount={tabCount} firstTabContent={firstTabContent} />
    </div>
  );
}

/** Consultant 로드맵 결과 페이지 스켈레톤 (3탭, regenerate + DRAFT 확정 버튼 자리) */
export function ConsultantRoadmapPageSkeleton() {
  return (
    <RoadmapPageSkeletonBase
      tabCount={3}
      firstTabContent="roadmap-overview"
      showRegenerateAccordion
      showFinalizeButton
    />
  );
}

/** Consultant PBL 결과 페이지 스켈레톤 (5탭, regenerate + DRAFT 확정 버튼 자리) */
export function ConsultantPBLPageSkeleton() {
  return (
    <RoadmapPageSkeletonBase
      tabCount={5}
      firstTabContent="pbl-overview"
      showRegenerateAccordion
      showFinalizeButton
    />
  );
}

/** 로드맵 결과 페이지 스켈레톤 (OPS용 — 3탭, regenerate·확정 버튼 없음) */
export function OpsRoadmapPageSkeleton() {
  return <RoadmapPageSkeletonBase tabCount={3} firstTabContent="roadmap-overview" />;
}

/** PBL 결과 페이지 스켈레톤 (OPS용 — 5탭, regenerate·확정 버튼 없음) */
export function OpsPBLPageSkeleton() {
  return <RoadmapPageSkeletonBase tabCount={5} firstTabContent="pbl-overview" />;
}

// ============================================================================
// 프로필 폼 스켈레톤
// ============================================================================

/**
 * 인터뷰 폼 스켈레톤 (스테퍼 + 폼 카드 + 네비게이션).
 *
 * Roadmap 트랙은 9 스텝 (`ROADMAP_STEPS`), PBL 트랙은 10 스텝 (`PBL_STEPS`).
 * `interview/loading.tsx` 가 `searchParams.track` 으로 분기해 적절한 stepCount 를 전달한다.
 * default 9 는 Roadmap 트랙 기본값.
 */
export function InterviewFormSkeleton({
  stepCount = 9,
}: { stepCount?: number } = {}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* PageHeader 미러 (제목 + description, 우측 actions 없음) */}
      <div>
        <SkeletonBar height="h-7" width="w-56" />
        <div className="mt-1">
          <SkeletonBar height="h-4" width="w-80" variant="secondary" />
        </div>
      </div>

      {/* 스테퍼 (카드 안에 들어감 — 실제 InterviewStepper 가 자체 카드 wrapper 보유) */}
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.compact}`}>
        {/* 데스크톱 스테퍼 */}
        <div className="hidden md:block relative" data-testid="skeleton-stepper-desktop">
          <div className="absolute top-4 inset-x-4 h-0.5 bg-gray-200" />
          <div className="flex justify-between relative">
            {renderItems(stepCount, (i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full ${SKELETON_BAR.primary} relative z-10`} />
                <SkeletonBar height="h-3" width="w-20" className="mt-2" variant="secondary" />
              </div>
            ))}
          </div>
        </div>

        {/* 모바일 스테퍼 — "N/M단계" + 현재 스텝명 + 진행 바 */}
        <div className="md:hidden" data-testid="skeleton-stepper-mobile">
          <div className="flex items-center justify-between mb-2">
            <SkeletonBar height="h-4" width="w-16" />
            <SkeletonBar height="h-4" width="w-24" />
          </div>
          <div className="flex items-center gap-1">
            {renderItems(stepCount, (i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${SKELETON_BAR[i === 0 ? 'primary' : 'secondary']}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/*
       * 폼 컨텐츠 — 실제 FormSection 은 카드 wrapper 가 없는 section 이다.
       * min-h-[400px] 로 영역 확보 + FormSection 헤더(번호 + 제목 + 라벨 + 설명) 미러.
       */}
      <div className="min-h-[400px] space-y-4">
        <header className="space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <SkeletonBar height="h-6" width="w-10" /> {/* 번호 (Ⅰ-1) */}
            <SkeletonBar height="h-6" width="w-32" /> {/* 제목 */}
            <SkeletonBar height="h-5" width="w-20" variant="secondary" /> {/* [인터뷰 입력] 라벨 */}
          </div>
          <SkeletonBar height="h-3.5" width="w-3/4" variant="secondary" /> {/* description */}
        </header>
        {/* 본문 — large textarea 1개 + 가이드 아코디언 */}
        <SkeletonBar height="h-40" width="w-full" />
        <SkeletonBar height="h-10" width="w-48" variant="secondary" />
      </div>

      {/*
       * StickyFormNav 미러 — sticky bottom-0 z-10 -mx 인셋 + border-t + backdrop-blur.
       * 좌(이전), 중(저장 인디케이터 + 저장 버튼), 우(다음 또는 최종 제출) 3섹션 구조.
       */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
          {/* 이전 (size-sm h-9) */}
          <SkeletonBar height="h-9" width="w-20" />
          {/* 중앙: 저장 인디케이터 + 수동 저장 버튼 */}
          <div className="flex items-center gap-3">
            <SkeletonBar height="h-3.5" width="w-24" variant="secondary" />
            <SkeletonBar height="h-9" width="w-20" />
          </div>
          {/* 다음/최종 제출 (마지막 스텝일 때 폭 더 넓어짐 — 평균값 w-24) */}
          <SkeletonBar height="h-9" width="w-24" />
        </div>
      </div>
    </div>
  );
}

/** 배지 셀렉터 영역 스켈레톤 (번호 라벨 + 설명 + 배지 그리드) */
function BadgeSelectorSkeleton({ badgeCount = 6 }: { badgeCount?: number }) {
  return (
    <div className="space-y-3">
      <div>
        <SkeletonBar height="h-4" width="w-40" />
        <SkeletonBar height="h-3" width="w-72" className="mt-1" variant="secondary" />
      </div>
      <div className="flex flex-wrap gap-2">
        {renderItems(badgeCount, (i) => (
          <SkeletonBar
            key={i}
            height="h-6"
            width={i % 3 === 0 ? 'w-20' : i % 3 === 1 ? 'w-24' : 'w-16'}
            className="rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

/** 텍스트영역 섹션 스켈레톤 (번호 라벨 + 설명 + textarea) */
function TextareaSectionSkeleton() {
  return (
    <div className="space-y-2">
      <div>
        <SkeletonBar height="h-4" width="w-36" />
        <SkeletonBar height="h-3" width="w-64" className="mt-1" variant="secondary" />
      </div>
      <SkeletonBar height="h-24" width="w-full" />
    </div>
  );
}

/** 컨설턴트 프로필 폼 스켈레톤 (dashboard/profile, consultant/profile 공용) */
export function ProfileFormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더: 뒤로가기 + 아이콘 + 제목 */}
      <div className="mb-6">
        <SkeletonBar height="h-9" width="w-28" className="mb-4" />
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${SKELETON_BAR.primary}`} />
          <div>
            <SkeletonBar height="h-7" width="w-28" className="mb-1" />
            <SkeletonBar height="h-4" width="w-56" variant="secondary" />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className={CARD_STYLES.base}>
        {/* CardHeader */}
        <div className="px-6 pt-6 pb-2">
          <SkeletonBar height="h-6" width="w-36" className="mb-1" />
          <SkeletonBar height="h-4" width="w-80" variant="secondary" />
        </div>

        {/* CardContent: 폼 */}
        <div className="px-6 pb-6 space-y-9">
          {/* 1. 소속 - Input */}
          <div className="space-y-2">
            <div>
              <SkeletonBar height="h-4" width="w-20" />
              <SkeletonBar height="h-3" width="w-56" className="mt-1" variant="secondary" />
            </div>
            <SkeletonBar height="h-11" width="w-full" />
          </div>

          {/* 2. AI 훈련 가능 산업 - BadgeSelector (INDUSTRIES: 11개) */}
          <BadgeSelectorSkeleton badgeCount={11} />

          {/* 2-1. 세부 업종 - 들여쓰기 서브섹션 */}
          <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-2">
            <div>
              <SkeletonBar height="h-4" width="w-32" />
              <SkeletonBar height="h-3" width="w-64" className="mt-1" variant="secondary" />
            </div>
            <SkeletonBar height="h-10" width="w-full" />
          </div>

          {/* 3. AI 적용 가능 업무 - BadgeSelector (EXPERTISE_DOMAINS: 16개) */}
          <BadgeSelectorSkeleton badgeCount={16} />

          {/* 4. 교육 대상 수준 - BadgeSelector */}
          <BadgeSelectorSkeleton badgeCount={4} />

          {/* 5. 선호 교육 방식 - BadgeSelector (COACHING_METHODS: 5개) */}
          <BadgeSelectorSkeleton badgeCount={5} />

          {/* 6. 보유 역량 - BadgeSelector (SKILL_TAGS: 15개) */}
          <BadgeSelectorSkeleton badgeCount={15} />

          {/* 7. 경력 - 짧은 Input + "년" */}
          <div className="space-y-2">
            <div>
              <SkeletonBar height="h-4" width="w-44" />
              <SkeletonBar height="h-3" width="w-52" className="mt-1" variant="secondary" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBar height="h-11" width="w-24" />
              <SkeletonBar height="h-4" width="w-6" variant="secondary" />
            </div>
          </div>

          {/* 8~10. 텍스트영역 3개 */}
          {renderItems(3, (i) => (
            <TextareaSectionSkeleton key={i} />
          ))}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <SkeletonBar height="h-10" width="w-16" />
            <SkeletonBar height="h-10" width="w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
