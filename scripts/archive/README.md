# scripts/archive

PR #26 (HWPX 1차 placeholder 도입) 잔존 스크립트.

## 보존 사유

옵션 B (SSOT 좌표 기반 채우기) 채택으로 placeholder 를 템플릿에 박지 않게 됨에 따라 더 이상 사용되지 않지만, 향후 옵션 A (placeholder 삽입) 로 전환 가능성을 남겨두기 위해 git 이력 + archive 디렉터리에 보관.

| 파일 | 원래 용도 |
|---|---|
| `port-hwpx-placeholders.py` | 사용자 정본 HWPX 에 SSOT placeholder 일괄 삽입 (PR #26 1회성) |
| `fix-roadmap-i3-alignment.py` | 로드맵 Ⅰ-3 셀 정렬 패치 (PR #26 1회성) |

## 후속 작업

향후 옵션 A 가 필요할 경우, 본 스크립트들의 OXML 안전 패턴 (`replace_text_in_runs` 단일 호출) 을 참고해 `scripts/insert_placeholders.py` 를 신설하라. SSOT JSON v2 (`docs/references/hwpx-placeholders.json`) 를 입력으로 받도록 확장하면 된다.
