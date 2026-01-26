'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchConsultantCandidates,
  fetchConsultantFilterOptions,
  type ConsultantCandidate,
} from '@/app/(dashboard)/ops/projects/actions';
import { getLevelLabel, CheckIcon, SpinnerIcon } from './assignment';

// ============================================================================
// 타입 정의
// ============================================================================

interface ConsultantSelectorProps {
  selectedConsultantId: string | null;
  onSelect: (consultant: ConsultantCandidate | null) => void;
}

interface FilterOptions {
  industries: string[];
  skills: string[];
}

// ============================================================================
// 상수
// ============================================================================

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ConsultantSelector({
  selectedConsultantId,
  onSelect,
}: ConsultantSelectorProps) {
  // 상태
  const [consultants, setConsultants] = useState<ConsultantCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    industries: [],
    skills: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // 필터 옵션 로드
  useEffect(() => {
    async function loadFilterOptions() {
      const options = await fetchConsultantFilterOptions();
      setFilterOptions(options);
    }
    loadFilterOptions();
  }, []);

  // 컨설턴트 목록 로드
  const loadConsultants = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchConsultantCandidates({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        industries: selectedIndustries,
        skills: selectedSkills,
      });
      setConsultants(result.consultants);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('컨설턴트 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, selectedIndustries, selectedSkills]);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setPage(1);
  }, [selectedIndustries, selectedSkills]);

  // 이벤트 핸들러
  const handleSelect = useCallback(
    (consultant: ConsultantCandidate) => {
      onSelect(selectedConsultantId === consultant.id ? null : consultant);
    },
    [selectedConsultantId, onSelect]
  );

  const toggleIndustry = useCallback((industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedIndustries([]);
    setSelectedSkills([]);
    setSearch('');
  }, []);

  const activeFilterCount = selectedIndustries.length + selectedSkills.length;
  const hasActiveFilters = activeFilterCount > 0 || debouncedSearch;

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 토글 */}
      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        activeFilterCount={activeFilterCount}
      />

      {/* 필터 패널 */}
      {showFilters && (
        <FilterPanel
          filterOptions={filterOptions}
          selectedIndustries={selectedIndustries}
          selectedSkills={selectedSkills}
          onToggleIndustry={toggleIndustry}
          onToggleSkill={toggleSkill}
          onClearFilters={clearFilters}
        />
      )}

      {/* 결과 요약 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>총 {total}명의 컨설턴트</span>
        {selectedConsultantId && <span className="text-blue-600">1명 선택됨</span>}
      </div>

      {/* 컨설턴트 목록 */}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : consultants.length === 0 ? (
          <EmptyState hasFilters={!!hasActiveFilters} />
        ) : (
          consultants.map((consultant) => (
            <ConsultantListItem
              key={consultant.id}
              consultant={consultant}
              isSelected={selectedConsultantId === consultant.id}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

interface SearchAndFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

function SearchAndFilterBar({
  search,
  onSearchChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
}: SearchAndFilterBarProps) {
  const isActive = showFilters || activeFilterCount > 0;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="컨설턴트 이름 또는 이메일 검색..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={onToggleFilters}
        className={`px-4 py-2 border rounded-md ${
          isActive
            ? 'border-blue-500 text-blue-600 bg-blue-50'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        필터 {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>
    </div>
  );
}

interface FilterPanelProps {
  filterOptions: FilterOptions;
  selectedIndustries: string[];
  selectedSkills: string[];
  onToggleIndustry: (industry: string) => void;
  onToggleSkill: (skill: string) => void;
  onClearFilters: () => void;
}

function FilterPanel({
  filterOptions,
  selectedIndustries,
  selectedSkills,
  onToggleIndustry,
  onToggleSkill,
  onClearFilters,
}: FilterPanelProps) {
  const hasSelectedFilters = selectedIndustries.length > 0 || selectedSkills.length > 0;

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">필터 옵션</h4>
        {hasSelectedFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm text-red-600 hover:text-red-800"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 업종 필터 */}
      {filterOptions.industries.length > 0 && (
        <FilterSection
          title="업종"
          items={filterOptions.industries}
          selectedItems={selectedIndustries}
          onToggle={onToggleIndustry}
          activeColor="blue"
        />
      )}

      {/* 스킬 필터 */}
      {filterOptions.skills.length > 0 && (
        <FilterSection
          title="역량 태그"
          items={filterOptions.skills}
          selectedItems={selectedSkills}
          onToggle={onToggleSkill}
          activeColor="purple"
        />
      )}
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  activeColor: 'blue' | 'purple';
}

function FilterSection({ title, items, selectedItems, onToggle, activeColor }: FilterSectionProps) {
  const activeStyles = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`px-2 py-1 text-xs rounded-full border ${
              selectedItems.includes(item)
                ? activeStyles[activeColor]
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center text-gray-500">
      <SpinnerIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
      로딩 중...
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="p-8 text-center text-gray-500">
      {hasFilters ? '검색 조건에 맞는 컨설턴트가 없습니다.' : '등록된 컨설턴트가 없습니다.'}
    </div>
  );
}

interface ConsultantListItemProps {
  consultant: ConsultantCandidate;
  isSelected: boolean;
  onSelect: (consultant: ConsultantCandidate) => void;
}

function ConsultantListItem({ consultant, isSelected, onSelect }: ConsultantListItemProps) {
  const profile = consultant.consultant_profile;

  return (
    <div
      onClick={() => onSelect(consultant)}
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{consultant.name}</span>
            {isSelected && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">선택됨</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{consultant.email}</p>

          {profile && <ConsultantProfileInfo profile={profile} />}
        </div>

        <div className="ml-4">
          <SelectionIndicator isSelected={isSelected} />
        </div>
      </div>
    </div>
  );
}

function ConsultantProfileInfo({
  profile,
}: {
  profile: NonNullable<ConsultantCandidate['consultant_profile']>;
}) {
  return (
    <div className="mt-2 space-y-1">
      {/* 업종 */}
      {profile.available_industries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.available_industries.slice(0, 3).map((industry) => (
            <span key={industry} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {industry}
            </span>
          ))}
          {profile.available_industries.length > 3 && (
            <span className="text-xs text-gray-400">+{profile.available_industries.length - 3}</span>
          )}
        </div>
      )}

      {/* 전문분야 & 레벨 */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {profile.expertise_domains.length > 0 && (
          <span>
            전문분야: {profile.expertise_domains.slice(0, 2).join(', ')}
            {profile.expertise_domains.length > 2 && ' 등'}
          </span>
        )}
        {profile.teaching_levels.length > 0 && (
          <span className="text-purple-600">
            {profile.teaching_levels.map(getLevelLabel).join('/')}
          </span>
        )}
      </div>

      {/* 경력 */}
      {profile.years_of_experience > 0 && (
        <p className="text-xs text-gray-500">경력 {profile.years_of_experience}년</p>
      )}
    </div>
  );
}

function SelectionIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
      }`}
    >
      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        이전
      </button>
      <span className="px-3 py-1 text-sm text-gray-600">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        다음
      </button>
    </div>
  );
}
