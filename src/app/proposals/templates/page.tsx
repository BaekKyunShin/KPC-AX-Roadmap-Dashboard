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
  Copy,
  Search,
  Star,
  User,
  Factory,
  Building2,
  BookOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const TEMPLATES = [
  {
    id: 't1',
    title: '전자/반도체 품질검사 AI 자동화 로드맵',
    description:
      '반도체 공정 품질검사 데이터를 AI로 분석하여 불량 검출 시간을 단축하고 정확도를 향상시키는 교육 과정 템플릿입니다.',
    industry: '전자/반도체',
    companySize: '대기업 (300인 이상)',
    createdBy: '김민수',
    isOwn: true,
    usageCount: 3,
    rating: 4.8,
    courseCount: 9,
    pblTitle: '배터리 품질검사 데이터 분석 자동화',
    createdAt: '2025-12-15',
    tags: ['품질관리', '데이터분석', 'AutoML'],
  },
  {
    id: 't2',
    title: '자동차 부품 제조공정 효율화 로드맵',
    description:
      '자동차 부품 제조 라인의 데이터를 활용한 공정 효율화 교육으로, 생산성 향상과 리드타임 단축을 목표로 합니다.',
    industry: '자동차/부품',
    companySize: '중견기업 (100-299인)',
    createdBy: '김민수',
    isOwn: true,
    usageCount: 2,
    rating: 4.5,
    courseCount: 9,
    pblTitle: '생산공정 데이터 분석 및 병목 해소',
    createdAt: '2025-11-20',
    tags: ['제조', '공정최적화', '데이터분석'],
  },
  {
    id: 't3',
    title: '식품안전 검사 자동화 로드맵',
    description:
      '식품 제조업체의 HACCP 기반 검사 데이터를 AI로 분석하여 위해요소를 사전 탐지하고, 검사 보고서를 자동 생성하는 교육 과정입니다.',
    industry: '식품/의약',
    companySize: '중소기업 (50-99인)',
    createdBy: '박지영',
    isOwn: false,
    usageCount: 5,
    rating: 4.9,
    courseCount: 9,
    pblTitle: 'HACCP 데이터 AI 분석 및 보고서 자동화',
    createdAt: '2026-01-08',
    tags: ['식품안전', 'HACCP', '보고서자동화'],
  },
  {
    id: 't4',
    title: '건설현장 안전관리 AI 적용 로드맵',
    description:
      '건설현장 CCTV 및 센서 데이터를 활용한 위험 감지 자동화, 안전 보고서 생성, 사고 예방 프로토콜 수립 교육입니다.',
    industry: '건설/엔지니어링',
    companySize: '대기업 (300인 이상)',
    createdBy: '이준호',
    isOwn: false,
    usageCount: 4,
    rating: 4.6,
    courseCount: 9,
    pblTitle: 'CCTV 기반 건설현장 위험 감지 시스템',
    createdAt: '2025-12-01',
    tags: ['안전관리', '영상분석', 'IoT'],
  },
  {
    id: 't5',
    title: '화학 공정 이상탐지 로드맵',
    description:
      '화학 공정의 센서 데이터를 실시간 모니터링하고, AI 기반 이상탐지로 사고를 예방하는 교육 과정 템플릿입니다.',
    industry: '화학/소재',
    companySize: '중견기업 (100-299인)',
    createdBy: '최영서',
    isOwn: false,
    usageCount: 1,
    rating: 4.3,
    courseCount: 9,
    pblTitle: '공정 센서 데이터 이상탐지 모델 구축',
    createdAt: '2026-01-22',
    tags: ['공정관리', '이상탐지', '센서데이터'],
  },
];

const INDUSTRY_FILTERS = [
  '전체',
  '전자/반도체',
  '자동차/부품',
  '화학/소재',
  '식품/의약',
  '건설/엔지니어링',
];

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function TemplatesMockup() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="로드맵 템플릿"
        description="우수 로드맵을 템플릿으로 저장하고 재활용합니다. 다른 컨설턴트의 공유 템플릿도 탐색할 수 있습니다."
      />

      {/* 검색 및 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="템플릿 검색 (업종, 키워드...)"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {INDUSTRY_FILTERS.map((filter, i) => (
            <Button
              key={filter}
              variant={i === 0 ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* 탭: 내 템플릿 / 공유 템플릿 */}
      <div className="flex gap-4 border-b">
        <button className="border-b-2 border-primary pb-2 text-sm font-medium text-primary">
          전체 ({TEMPLATES.length})
        </button>
        <button className="pb-2 text-sm text-gray-500 hover:text-gray-700">
          내 템플릿 ({TEMPLATES.filter((t) => t.isOwn).length})
        </button>
        <button className="pb-2 text-sm text-gray-500 hover:text-gray-700">
          공유 템플릿 ({TEMPLATES.filter((t) => !t.isOwn).length})
        </button>
      </div>

      {/* 템플릿 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base leading-tight">
                    {template.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Factory className="mr-1 h-3 w-3" />
                      {template.industry}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="mr-1 h-3 w-3" />
                      {template.companySize}
                    </Badge>
                  </div>
                </div>
                {template.isOwn && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs flex-shrink-0">
                    내 템플릿
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-2">
                {template.description}
              </p>

              {/* PBL 과정 정보 */}
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">PBL 최적 과정</p>
                <p className="text-sm font-medium text-gray-800">
                  {template.pblTitle}
                </p>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-2 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* 메타 정보 */}
              <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {template.createdBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {template.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" />
                    {template.usageCount}회 사용
                  </span>
                </div>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <BookOpen className="h-3 w-3" />
                  사용하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
