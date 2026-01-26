'use client';

export type TabType = 'auto' | 'manual';

interface Tab {
  id: TabType;
  label: string;
  badge?: number;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: Tab[];
}

export default function TabNavigation({ activeTab, onTabChange, tabs }: TabNavigationProps) {
  return (
    <div className="mb-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                  {tab.badge}명
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// 탭별 설명 텍스트
export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  auto: '자가진단 결과를 기반으로 추천된 컨설턴트 중에서 선택합니다.',
  manual: '모든 활성 컨설턴트 중에서 직접 선택하여 배정합니다.',
};
