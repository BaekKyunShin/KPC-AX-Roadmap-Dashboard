'use client';

interface ScoreBreakdown {
  criteria: string;
  score: number;
  maxScore: number;
  explanation: string;
}

interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown: ScoreBreakdown[];
  rationale: string;
  rank: number;
  candidate: {
    id: string;
    name: string;
    email: string;
    consultant_profile: {
      expertise_domains: string[];
      available_industries: string[];
      skill_tags: string[];
      years_of_experience: number;
    }[];
  };
}

interface MatchingRecommendationsProps {
  recommendations: Recommendation[];
}

export default function MatchingRecommendations({ recommendations }: MatchingRecommendationsProps) {
  return (
    <div className="space-y-4">
      {recommendations.map((rec) => {
        const profile = rec.candidate.consultant_profile?.[0];
        const scorePercentage = Math.round(rec.total_score * 100);

        return (
          <div
            key={rec.id}
            className={`border rounded-lg p-4 ${
              rec.rank === 1 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2 ${
                      rec.rank === 1
                        ? 'bg-purple-600 text-white'
                        : rec.rank === 2
                          ? 'bg-gray-400 text-white'
                          : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {rec.rank}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{rec.candidate.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">{rec.candidate.email}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{scorePercentage}점</div>
                <div className="text-xs text-gray-500">/ 100점</div>
              </div>
            </div>

            {/* 프로필 요약 */}
            {profile && (
              <div className="mb-3 text-sm">
                <div className="flex flex-wrap gap-1 mb-2">
                  {profile.expertise_domains.slice(0, 3).map((domain) => (
                    <span
                      key={domain}
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {domain}
                    </span>
                  ))}
                  {profile.expertise_domains.length > 3 && (
                    <span className="text-gray-400 text-xs">
                      +{profile.expertise_domains.length - 3}
                    </span>
                  )}
                </div>
                <p className="text-gray-600">
                  {profile.years_of_experience}년 경력 | {profile.available_industries.join(', ')}
                </p>
              </div>
            )}

            {/* 점수 상세 */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {rec.score_breakdown.map((item) => (
                <div key={item.criteria} className="text-center">
                  <div className="text-xs text-gray-500">{item.criteria}</div>
                  <div className="font-semibold">
                    {item.score}/{item.maxScore}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 근거 */}
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded break-keep">
              <strong>추천 근거:</strong> {rec.rationale}
            </div>
          </div>
        );
      })}
    </div>
  );
}
