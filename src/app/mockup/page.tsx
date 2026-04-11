import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardCheck,
  LayoutList,
  FolderOpen,
  ListChecks,
  FileStack,
  ArrowRight,
} from 'lucide-react';

const MOCKUP_PAGES = [
  {
    group: '컨설턴트 화면',
    pages: [
      {
        href: '/mockup/consultant-deliverable-tab',
        title: '프로젝트 상세 — 결과물 탭',
        description: '기존 프로젝트 상세에 추가되는 5번째 탭. 서류 업로드 체크리스트와 최종 제출 기능.',
        icon: ClipboardCheck,
      },
      {
        href: '/mockup/consultant-results',
        title: '결과물 관리 페이지',
        description: '담당 프로젝트 전체의 서류 제출 현황을 한눈에 조감하는 별도 메뉴.',
        icon: LayoutList,
      },
    ],
  },
  {
    group: '운영관리자 화면',
    pages: [
      {
        href: '/mockup/ops-deliverable-section',
        title: '프로젝트 상세 — 결과물 섹션',
        description: '기존 프로젝트 상세 하단에 추가되는 읽기 전용 결과물 섹션. 파일 다운로드 지원.',
        icon: FolderOpen,
      },
      {
        href: '/mockup/ops-results',
        title: '결과물 관리 페이지',
        description: '전체 프로젝트/컨설턴트별 서류 제출 현황 조감 및 다운로드.',
        icon: ListChecks,
      },
      {
        href: '/mockup/ops-templates',
        title: '서류 템플릿 관리',
        description: '서류 종류(필수/선택, 확장자, 파일 수)를 동적으로 관리하는 운영 화면.',
        icon: FileStack,
      },
    ],
  },
];

export default function MockupIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">결과물 제출 기능 목업</h1>
        <p className="mt-1 text-sm text-gray-500">
          로드맵 확정 후 증빙 서류 제출 → 프로젝트 완료 처리를 위한 UI 시안입니다.
        </p>
      </div>

      {MOCKUP_PAGES.map((group) => (
        <div key={group.group} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            {group.group}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {group.pages.map((page) => (
              <Link key={page.href} href={page.href}>
                <Card className="transition-colors hover:border-blue-300 hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <page.icon className="h-5 w-5 text-blue-600" />
                      {page.title}
                      <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">{page.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
