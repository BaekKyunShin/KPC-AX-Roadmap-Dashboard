'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { List, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectStatus } from '@/types/database';
import StatsSummaryCards from './StatsSummaryCards';
import ProjectList from './ProjectList';

const ProjectDashboard = dynamic(() => import('./ProjectDashboard'), {
  loading: () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[280px] animate-shimmer rounded-lg border" />
        ))}
      </div>
      <div className="h-[280px] animate-shimmer rounded-lg border" />
    </div>
  ),
});

export default function ProjectManagementTabs() {
  const [activeTab, setActiveTab] = useState('list');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[] | null>(null);

  const handleStatusFilter = (statuses: ProjectStatus[] | null) => {
    setStatusFilter(statuses);
    // 상태 필터 클릭 시 목록 탭으로 이동
    if (statuses !== null) {
      setActiveTab('list');
    }
  };

  return (
    <div className="space-y-6">
      {/* 요약 카드 - 항상 표시 */}
      <StatsSummaryCards
        onStatusFilter={handleStatusFilter}
        activeStatuses={statusFilter}
      />

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="gap-1 p-1">
          <TabsTrigger value="list" className="gap-2 px-4">
            <List className="h-4 w-4" />
            프로젝트 목록
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 px-4">
            <BarChart3 className="h-4 w-4" />
            진행 현황 대시보드
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ProjectList statusFilter={statusFilter} />
        </TabsContent>

        <TabsContent value="dashboard">
          <ProjectDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
