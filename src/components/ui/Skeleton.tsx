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
    { header: '작업', width: 'min-w-[100px]' },
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

/** 템플릿 관리 테이블 설정 (ops/templates) */
const TEMPLATE_TABLE: TableConfig = {
  columns: [
    { header: '버전', width: 'min-w-[80px]' },
    { header: '템플릿 이름', width: 'min-w-[160px]' },
    { header: '문항 수', width: 'min-w-[80px]' },
    { header: '사용 현황', width: 'min-w-[100px]' },
    { header: '상태', width: 'min-w-[80px]' },
    { header: '생성일', width: 'min-w-[100px]' },
    { header: '작업', width: 'min-w-[140px]' },
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
  );
}

/** 컨설턴트 담당 프로젝트 테이블 스켈레톤 */
export function ConsultantProjectTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = CONSULTANT_PROJECT_TABLE;

  return (
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
  );
}

/** 감사로그 테이블 스켈레톤 */
export function AuditLogTableSkeleton({ rows = 10 }: TableSkeletonProps) {
  const { columns, minWidth } = AUDIT_LOG_TABLE;

  return (
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
  );
}

/** 사용자 관리 테이블 스켈레톤 */
export function UserTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = USER_TABLE;

  return (
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
            {/* 작업 */}
            <td className={TABLE_STYLES.td}>
              <SkeletonBar height="h-4" width="w-12" className="mx-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </TableSkeletonWrapper>
  );
}

/** 쿼터 관리 테이블 스켈레톤 */
export function QuotaTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = QUOTA_TABLE;

  return (
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
  );
}

/** 템플릿 관리 테이블 스켈레톤 */
export function TemplateTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  const { columns, minWidth } = TEMPLATE_TABLE;

  return (
    <TableSkeletonWrapper minWidth={minWidth}>
      <TableSkeletonHeader columns={columns} />
      <tbody className={TABLE_STYLES.tbody}>
        {renderItems(rows, (i) => (
          <tr key={i}>
            {/* 버전: 배지 */}
            <td className={TABLE_STYLES.td}>
              <SkeletonBar height="h-5" width="w-10" className="mx-auto" />
            </td>
            {/* 템플릿 이름 + 설명 */}
            <td className={TABLE_STYLES.td}>
              <SkeletonBar height="h-4" width="w-28" className="mb-1 mx-auto" />
              <SkeletonBar height="h-3" width="w-36" variant="secondary" className="mx-auto" />
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
            {/* 작업 */}
            <td className={TABLE_STYLES.td}>
              <div className="flex items-center justify-center gap-3">
                <SkeletonBar height="h-4" width="w-8" />
                <SkeletonBar height="h-4" width="w-12" />
                <SkeletonBar height="h-4" width="w-8" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableSkeletonWrapper>
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
// 로드맵 스켈레톤 컴포넌트
// ============================================================================

/** 로드맵 버전 히스토리 카드 스켈레톤 */
function VersionHistorySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.compact}`}>
      <SkeletonBar height="h-4" width="w-24" className="mb-3" />
      <div className="space-y-2">
        {renderItems(rows, (i) => (
          <div key={i} className="px-3 py-2 rounded bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <SkeletonBar height="h-4" width="w-8" />
              <SkeletonBar height="h-5" width="w-14" />
            </div>
            <SkeletonBar height="h-3" width="w-20" variant="secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 로드맵 생성 카드 스켈레톤 (컨설턴트용) */
function RoadmapGenerateCardSkeleton() {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding.compact}`}>
      <SkeletonBar height="h-4" width="w-20" className="mb-3" />
      <SkeletonBar height="h-20" width="w-full" className="mb-2" />
      <SkeletonBar height="h-9" width="w-full" />
    </div>
  );
}

/** 로드맵 매트릭스 스켈레톤 */
function RoadmapMatrixSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[100px] px-3 py-2 text-left text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200">
              <SkeletonBar height="h-4" width="w-16" />
            </th>
            {['초급', '중급', '고급'].map((level) => (
              <th key={level} className="px-3 py-2 text-center text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200">
                {level}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderItems(4, (rowIndex) => (
            <tr key={rowIndex}>
              <td className="px-3 py-3 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200">
                <SkeletonBar height="h-4" width="w-20" />
              </td>
              {renderItems(3, (colIndex) => (
                <td key={colIndex} className="px-3 py-3 border border-gray-200 align-top">
                  <div className="space-y-2">
                    {renderItems(rowIndex % 2 === 0 ? 2 : 1, (i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded">
                        <SkeletonBar height="h-4" width="w-full" className="mb-1" />
                        <SkeletonBar height="h-3" width="w-16" variant="secondary" />
                      </div>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 로드맵 내용 영역 스켈레톤 */
function RoadmapContentSkeleton() {
  return (
    <div className={CARD_STYLES.base}>
      {/* 버전 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SkeletonBar height="h-6" width="w-20" />
            <SkeletonBar height="h-5" width="w-14" />
            <SkeletonBar height="h-4" width="w-24" variant="secondary" />
          </div>
          <div className="flex items-center space-x-2">
            <SkeletonBar height="h-9" width="w-24" />
            <SkeletonBar height="h-9" width="w-24" />
            <SkeletonBar height="h-9" width="w-28" />
          </div>
        </div>
        <SkeletonBar height="h-4" width="w-3/4" className="mt-3" />
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex -mb-px">
          {renderItems(3, (i) => (
            <div key={i} className="px-6 py-3">
              <SkeletonBar height="h-4" width="w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* 내용 */}
      <div className="p-6">
        <RoadmapMatrixSkeleton />
      </div>
    </div>
  );
}

/** 로드맵 페이지 스켈레톤 공통 레이아웃 */
function RoadmapPageSkeletonBase({
  showDescription = false,
  showGenerateCard = false,
}: {
  showDescription?: boolean;
  showGenerateCard?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <SkeletonBar height="h-4" width="w-32" className="mb-2" />
        <SkeletonBar height="h-8" width="w-48" />
        {showDescription && (
          <SkeletonBar height="h-4" width="w-64" className="mt-1" variant="secondary" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 생성 카드(선택) + 버전 목록 */}
        <div className="lg:col-span-1 space-y-4">
          {showGenerateCard && <RoadmapGenerateCardSkeleton />}
          <VersionHistorySkeleton />
        </div>

        {/* 오른쪽: 로드맵 내용 */}
        <div className="lg:col-span-3">
          <RoadmapContentSkeleton />
        </div>
      </div>
    </div>
  );
}

/** 로드맵 페이지 스켈레톤 (컨설턴트용 - 생성 버튼 포함) */
export function RoadmapPageSkeleton() {
  return <RoadmapPageSkeletonBase showGenerateCard />;
}

/** 로드맵 페이지 스켈레톤 (OPS용 - 읽기 전용) */
export function OpsRoadmapPageSkeleton() {
  return <RoadmapPageSkeletonBase showDescription />;
}
