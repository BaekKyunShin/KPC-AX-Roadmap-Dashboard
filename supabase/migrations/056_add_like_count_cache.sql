-- like_count 캐시 컬럼 + 트리거
-- 갤러리 인기순 정렬을 DB에서 처리하기 위한 비정규화

-- 1. 캐시 컬럼 추가
ALTER TABLE public.roadmap_versions
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

-- 2. 기존 데이터 동기화
UPDATE public.roadmap_versions rv
SET like_count = COALESCE((
  SELECT COUNT(*)::INTEGER
  FROM public.roadmap_likes rl
  WHERE rl.roadmap_version_id = rv.id
), 0);

-- 3. INSERT 트리거
CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.roadmap_versions
  SET like_count = like_count + 1
  WHERE id = NEW.roadmap_version_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_like_count
  AFTER INSERT ON public.roadmap_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_like_count();

-- 4. DELETE 트리거
CREATE OR REPLACE FUNCTION public.decrement_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.roadmap_versions
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.roadmap_version_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_like_count
  AFTER DELETE ON public.roadmap_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_like_count();

-- 5. 정렬 인덱스
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_like_count
  ON public.roadmap_versions (like_count DESC);
