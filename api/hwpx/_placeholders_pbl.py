"""
PBL HWPX 보조 상수·헬퍼 (v2 마커 방식).

v2 부터 payload → {{마커}} 값 변환은 `generate.py::_build_pbl_markers` 가 전담한다
(로드맵 `_build_roadmap_markers` 미러). 본 모듈은 그 렌더러가 재사용하는 소량의
양식 고정 상수와 순수 헬퍼만 제공한다.

- `TRAINING_GOAL_LABELS`      : 훈련목표 5종 (Ⅰ-개요·Ⅳ-2 인라인 체크박스 토글용)
- `COURSE_EVALUATION_METHODS` : 과정평가 방법 3종 (Ⅳ-5-가 체크박스 토글용)
- `_bulletize(items)`         : 문자열 배열 → "• a\n• b"
"""
from typing import Any

TRAINING_GOAL_LABELS: tuple[str, ...] = (
    "기술문제 해결",
    "공정 최적화",
    "불량률 감소",
    "기술 매뉴얼 개발",
    "기타",
)

COURSE_EVALUATION_METHODS: tuple[str, ...] = (
    "포트폴리오",
    "문제해결시나리오",
    "작업장 평가",
)


def _str_or_empty(v: Any) -> str:
    if v is None:
        return ""
    return str(v)


def _bulletize(items: Any) -> str:
    """문자열 배열 → "• a\n• b" 형식, 이미 문자열이면 그대로."""
    if not items:
        return ""
    if isinstance(items, str):
        return items
    if isinstance(items, (list, tuple)):
        return "\n".join(f"• {str(i)}" for i in items if _str_or_empty(i).strip())
    return _str_or_empty(items)
