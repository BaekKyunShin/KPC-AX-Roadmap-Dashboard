'use client';

import { type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export type ProjectTab = 'company-info' | 'pre-analysis' | 'interview' | 'activity';

interface ProjectDetailTabsProps {
  defaultTab?: ProjectTab;
  companyInfoContent: ReactNode;
  preAnalysisContent: ReactNode;
  interviewContent: ReactNode;
  activityContent: ReactNode;
}

const TAB_CONFIG: { value: ProjectTab; label: string }[] = [
  { value: 'company-info', label: '기업 정보' },
  { value: 'pre-analysis', label: '사전 분석' },
  { value: 'interview', label: '인터뷰 기록' },
  { value: 'activity', label: '활동 일지' },
];

export function ProjectDetailTabs({
  defaultTab = 'company-info',
  companyInfoContent,
  preAnalysisContent,
  interviewContent,
  activityContent,
}: ProjectDetailTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
        {TAB_CONFIG.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 shadow-none transition-colors hover:text-gray-700 data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="company-info" className="mt-6">
        {companyInfoContent}
      </TabsContent>

      <TabsContent value="pre-analysis" className="mt-6">
        {preAnalysisContent}
      </TabsContent>

      <TabsContent value="interview" className="mt-6">
        {interviewContent}
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        {activityContent}
      </TabsContent>
    </Tabs>
  );
}
