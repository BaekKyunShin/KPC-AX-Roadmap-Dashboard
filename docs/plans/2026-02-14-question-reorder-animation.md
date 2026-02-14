# 질문 리오더링 애니메이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 템플릿 질문 목록의 위/아래 버튼 swap 시 부드러운 애니메이션 추가 + 드래그 앤 드롭 리오더링 지원

**Architecture:** Motion(framer-motion 후속)의 Reorder 컴포넌트로 `TemplateForm.tsx`의 질문 목록을 감싸고, `useDragControls`로 드래그 핸들을 구현한다. 기존 위/아래 버튼은 유지하되, 상태 변경 시 `layout` 애니메이션이 자동 적용된다.

**Tech Stack:** motion (React animation library), Lucide React (GripVertical 아이콘)

---

### Task 1: motion 패키지 설치

```bash
npm install motion
```

### Task 2: QuestionItem 컴포넌트 추출 + Reorder 통합

**Files:**
- Modify: `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx`

**변경 사항:**
- `QuestionItem` 서브컴포넌트 추출 (useDragControls 훅은 아이템별로 필요)
- 질문 목록 컨테이너를 `Reorder.Group`으로 교체
- 각 질문 카드를 `Reorder.Item`으로 교체
- `GripVertical` 드래그 핸들 추가
- `dragListener={false}` 설정 (핸들만 드래그 가능하도록)
- 기존 up/down 버튼의 `handleMoveQuestion` 유지 (상태 변경만으로 layout 애니메이션 자동 적용)
- `Reorder.Group values`에는 string ID 배열 사용 (객체 참조 비교 문제 회피)

### Task 3: 테스트 작성

**Files:**
- Create: `src/app/(dashboard)/ops/templates/_components/TemplateForm.test.tsx`

**테스트 항목:**
- 질문 목록이 올바른 순서로 렌더링되는지
- 드래그 핸들(GripVertical)이 표시되는지
- 위/아래 이동 버튼이 정상 동작하는지
- 질문 추가/삭제가 정상 동작하는지

### Task 4: 검증

```bash
npm run validate  # typecheck + lint + test
npm run build     # 프로덕션 빌드 검증
```
