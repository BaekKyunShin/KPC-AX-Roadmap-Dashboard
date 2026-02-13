/** 과정 토픽에서 핵심 키워드 태그를 추출 (최대 3개) */
export function extractTags(industry: string, courses: { topic?: string }[]): string[] {
  // 업종에서 슬래시 앞부분만 추출 (예: "의료/헬스케어" → "의료")
  const industryShort = industry?.split('/')[0] || '';

  // 과정 토픽에서 핵심 키워드 추출
  const topicKeywords: string[] = [];
  for (const course of courses) {
    if (!course.topic) continue;
    // 긴 토픽에서 핵심 명사구 추출 (2~6자 한국어 단어)
    const words = course.topic
      .replace(/[()（）]/g, ' ')
      .split(/[\s,+/·]+/)
      .filter((w) => /^[가-힣]{2,6}$/.test(w))
      .filter((w) => !['기초', '개론', '활용', '이해', '실습', '실전', '입문', '기반'].includes(w));
    topicKeywords.push(...words);
  }

  // 중복 제거 후 빈도 높은 순 + 업종 태그 합산
  const freq = new Map<string, number>();
  for (const kw of topicKeywords) {
    freq.set(kw, (freq.get(kw) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const tags: string[] = industryShort ? [industryShort] : [];
  for (const [kw] of sorted) {
    if (tags.length >= 3) break;
    if (!tags.includes(kw)) tags.push(kw);
  }
  return tags;
}
