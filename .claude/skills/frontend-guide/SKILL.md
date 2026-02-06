---
name: frontend-guide
description: 프론트엔드 UI 컴포넌트나 페이지를 생성하거나 수정할 때 프로젝트의 디자인 패턴과 컴포넌트 규칙을 적용합니다
user-invocable: true
argument-hint: [파일경로]
---

# 프론트엔드 가이드

$ARGUMENTS 파일을 이 가이드에 따라 작성/검사하세요.

---

## 0. 디자인 방향

이 프로젝트는 **세련되고 고급스러우며 깔끔하고 체계적인** B2B 대시보드를 지향한다.

### 핵심 원칙

- **색상은 절제**: 화려한 그라데이션이나 과한 색상 사용 자제.
- **타이포그래피 위계**: 제목/본문/캡션 크기를 명확히 구분.
- **그림자와 테두리는 미세하게**: `shadow-sm`, `border-gray-200` 수준. 두꺼운 그림자나 강한 테두리 금지
- **정렬을 엄격하게**: 요소 간 간격 일관성 유지

### 하지 말 것

- 여러 색상을 섞어 산만하게 만들기
- 불필요한 장식 (아이콘 남발, 배경 패턴 등)
- 페이지마다 다른 스타일로 만들기

---

## 1. 컴포넌트 구조

### 폴더 규칙

```
src/components/
  ui/           → shadcn/ui 기본 컴포넌트 + 커스텀 공용 컴포넌트
  landing/      → 랜딩 페이지 전용
  consultant/   → 컨설턴트 전용
  ops/          → 운영관리자 전용
  roadmap/      → 로드맵 전용
  interview/    → 인터뷰 전용

src/app/(dashboard)/[role]/[feature]/_components/
  → 특정 페이지에서만 쓰는 컴포넌트
```

- **공용 컴포넌트**: `src/components/` 하위에 배치
- **페이지 전용 컴포넌트**: 해당 페이지 `_components/` 폴더에 배치
- **파일명**: PascalCase (`ProfileForm.tsx`, `Navigation.tsx`)
- **폴더명**: kebab-case 또는 lowercase (`landing/`, `ops/`)

### 컴포넌트 파일 구조

```tsx
'use client'; // 필요한 경우에만

import { ... } from 'react';
import { Button } from '@/components/ui/button';

// 1. 타입 정의
interface Props { ... }

// 2. 상수/설정값
const ITEMS_PER_PAGE = 10;

// 3. 헬퍼 함수
function formatDate(date: string) { ... }

// 4. 컴포넌트
export default function MyComponent({ ... }: Props) {
  return ( ... );
}
```

---

## 2. shadcn/ui 사용 규칙

### 설치된 주요 컴포넌트

Button, Input, Card, Dialog, Select, Table, Textarea, Badge, Tabs, Alert, Avatar, Checkbox, Accordion, Label, Separator

### 커스텀 공용 컴포넌트

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| `PageHeader` | `ui/page-header.tsx` | 페이지 제목 + 설명 + 액션 버튼 |
| `FieldError` | `ui/field-error.tsx` | 폼 필드 에러 표시 (아이콘 포함) |
| `Skeleton` | `ui/Skeleton.tsx` | 테이블/카드/페이지별 스켈레톤 |
| `EmptyState` | `ui/EmptyState.tsx` | 빈 상태 UI |
| `SearchInput` | `ui/SearchInput.tsx` | 검색 필드 |
| `Pagination` | `ui/Pagination.tsx` | 페이지네이션 |

### import 패턴

```tsx
// shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// 커스텀 공용
import { PageHeader } from '@/components/ui/page-header';
import { FieldError } from '@/components/ui/field-error';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';

// 아이콘: Lucide React
import { Plus, Search, Loader2, AlertCircle } from 'lucide-react';

// 유틸리티
import { cn } from '@/lib/utils';

// 토스트
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
```

---

## 3. 스타일링 규칙

### Tailwind 클래스 순서

```
레이아웃 → 크기 → 간격 → 색상 → 테두리 → 효과 → 상태
```

```tsx
// 좋음
className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border text-sm transition-colors hover:bg-gray-50"

// 나쁨 (순서 뒤죽박죽)
className="hover:bg-gray-50 border flex bg-white text-sm px-3 gap-2 items-center"
```

### cn() 헬퍼 사용

조건부 클래스나 컴포넌트 className props 병합 시 반드시 `cn()` 사용:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "flex items-center gap-2 rounded-md",
  isActive && "bg-primary text-white",
  className
)} />
```

### 색상 체계

CSS 변수 기반 (OKLch). 직접 색상 하드코딩 지양:

```tsx
// 좋음: CSS 변수 활용
className="bg-primary text-primary-foreground"
className="text-destructive"
className="border-input"

// 나쁨: 하드코딩
className="bg-[#1a1a1a] text-[#ffffff]"
```

예외: `gray-50`, `gray-100` 등 Tailwind 기본 gray는 사용 가능.

### 폰트

- 기본 본문: Pretendard (한국어 최적화)
- 코드/모노: Geist Mono
- 별도 폰트 추가 금지 (기존 폰트 체계 유지)

---

## 4. 반응형 디자인

### 필수: 모바일 퍼스트

모든 새 컴포넌트는 모바일부터 설계 → 데스크톱으로 확장:

```tsx
// 좋음: 모바일 기본 → md/lg에서 확장
<div className="flex flex-col gap-4 md:flex-row md:items-center">
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

// 나쁨: 데스크톱 기본 → 모바일 축소
<div className="flex flex-row max-md:flex-col">
```

### 주요 브레이크포인트 패턴

```tsx
// 네비게이션: md 기준 모바일/데스크톱
<nav className="hidden md:flex">       {/* 데스크톱 메뉴 */}
<button className="md:hidden">         {/* 모바일 햄버거 */}

// 콘텐츠 그리드: lg 기준
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

// 폼 레이아웃: md 기준
<div className="flex flex-col gap-4 md:flex-row">

// 테이블: 가로 스크롤
<div className="overflow-x-auto">
  <table className="w-full table-fixed">
```

---

## 5. 페이지 작성 패턴

### Server Component 페이지 (기본)

```tsx
// src/app/(dashboard)/[role]/[feature]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <PageHeader
        title="페이지 제목"
        description="페이지 설명"
        actions={<Button>액션</Button>}
      />
      <MyClientComponent />
    </div>
  );
}
```

### Loading 상태 (필수)

새 페이지 생성 시 `loading.tsx` 함께 생성:

```tsx
// src/app/(dashboard)/[role]/[feature]/loading.tsx
import { PageHeader } from '@/components/ui/page-header';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="페이지 제목" />
      <ProjectTableSkeleton rows={5} />
    </div>
  );
}
```

스켈레톤은 `src/components/ui/Skeleton.tsx`에 정의. 새 스켈레톤이 필요하면 여기에 추가하고 shimmer 애니메이션 사용.

### Client Component 분리

인터랙티브 부분만 `'use client'`로 분리:

```tsx
// page.tsx (Server) → 인증, 데이터 fetch
// _components/MyInteractiveSection.tsx (Client) → 상태 관리, 이벤트
```

---

## 6. 폼 작성 패턴

이 프로젝트는 네이티브 HTML 폼 사용 (react-hook-form 미사용):

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { Loader2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

export default function MyForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await myServerAction(formData);

    if (result.success) {
      showSuccessToast('저장되었습니다');
    } else {
      showErrorToast('저장 실패', result.error);
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input id="name" name="name" required placeholder="이름 입력" />
        <FieldError message={errors.name} />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        {isLoading ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
```

### 에러 표시

```tsx
// Input에 aria-invalid 연결
<Input aria-invalid={!!errors.email} />
<FieldError message={errors.email} />
```

---

## 7. 공통 UI 패턴

### 빈 상태

```tsx
import { EmptyState } from '@/components/ui/EmptyState';

<EmptyState
  title="프로젝트가 없습니다"
  description="새 프로젝트를 생성해보세요."
  action={<Button>새 프로젝트</Button>}
/>
```

### 로딩 버튼

```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
  {isLoading ? '처리 중...' : '확인'}
</Button>
```

### 토스트 알림

```tsx
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

showSuccessToast('저장되었습니다');
showErrorToast('오류 발생', '상세 메시지');
```

### 페이지 헤더

```tsx
<PageHeader
  title="제목"
  description="설명"
  backLink="/목록경로"        // 선택: 뒤로가기 링크
  actions={<Button>액션</Button>}  // 선택: 우측 버튼
/>
```

위반 사항을 목록으로 정리하고 수정 방법을 제안하세요.
