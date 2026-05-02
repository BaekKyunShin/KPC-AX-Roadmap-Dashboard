# HWPX 옵션 A 전환 검토 (backlog)

> **우선순위**: 낮음 (옵션 B 가 잘 작동 중).
> **선행 조건**: PR #4 (PDF 대조 리포트 + 한글 오피스 실물 검증) 완료 후 검토.
> **트리거 조건**: 옵션 B 의 한계 발견 시 (예: SSOT 좌표 변경 부담, 양식 자주 갱신).

## 배경

PR #3 (HWPX 템플릿 재구축) 에서 옵션 B (사용자 정본 + SSOT 좌표 직접 채움) 를
채택했다. PR #26 의 placeholder 자동 삽입이 한컴오피스 거부 (cellAddr/id/linesegarray
중복) 를 유발한 전례 때문.

옵션 A 의 잠재적 이점:
- SSOT 좌표 변경 시 generate.py 가 placeholder 키만 알면 됨 → 양식 갱신 비용 감소
- 새 placeholder 추가 시 SSOT JSON 수정만으로 자동 반영
- shallow vs nested table_index 카운팅 차이 issue 해소 (placeholder 가 셀 텍스트라 인덱스 무관)

## 검토 가설

**가설**: PR #26 의 거부 원인은 표 셀 안 paragraph 의 runs 분리. 셀의 단일
paragraph 의 runs[0].text 위치에만 placeholder 를 삽입하면 (runs 분리 없이)
한컴오피스가 거부하지 않을 것.

## 검증 단계

1. **재현** — PR #26 의 commit (예: `c91d49c` 부근) 에서 거부 시나리오 재현
   - 한컴오피스로 PR #26 의 placeholder 삽입판 열기 → 거부 메시지 캡처
   - 삽입 위치 (cellAddr / id / linesegarray) 분석

2. **단순 삽입 실험** —
   `python-hwpx` 로 사용자 정본 (`templates/hwpx/{roadmap,pbl}.hwpx`) 을 열고,
   각 표 셀의 첫 paragraph 의 첫 run 의 text 만 `{{key}}` 로 교체.
   기존 runs 의 cellAddr / id / linesegarray 보존.

3. **한컴오피스 실물 검증** —
   2 의 결과 HWPX 를 한컴오피스로 열기. 거부 없으면 옵션 A 채택 가능.

4. **SSOT 자동 삽입 스크립트 작성** (검증 통과 시) —
   `scripts/insert_placeholders.py` 신설. SSOT v2 의 `location.cell` / `data_row_start`
   좌표 기반 placeholder 자동 삽입.

5. **generate.py 단순화** —
   기존 `_fill_pbl_*()` 의 cell 좌표 직접 채움 코드 일부를 `_replace_in_all_runs`
   기반으로 deprecation. 양쪽 방식 병행하다가 옵션 A 안정 시 옵션 B 코드 제거.

## 의사결정 트리

```
PR #4 의 한글 오피스 실물 검증 결과 → 옵션 B 가 안정적인가?
  └─ YES (예상) → 옵션 A 전환 후순위. 양식 자주 갱신될 때 재검토.
  └─ NO → 옵션 A 검증 즉시 착수. 옵션 B 의 셀 좌표 부정합 issue 발생 시점 기준.
```

## 비고

- 옵션 A 채택 시 `scripts/archive/port-hwpx-placeholders.py` 의 placeholder 삽입
  로직을 참고 가능 (PR #26 의 거부 원인 부분만 수정).
- SSOT v2 (`docs/references/hwpx-placeholders.json`) 의 placeholder 명명은 이미
  옵션 A 호환 (V1 짧은 키 alias 도 함께 출력 중).

본 항목은 PR #4 종결 후 검토. 본 prompt 는 backlog 로만 보관.
