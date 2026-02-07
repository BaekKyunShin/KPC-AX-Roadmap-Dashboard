interface DimensionScore {
  dimension: string;
  score: number;
  max_score: number;
}

interface SelfAssessmentScores {
  total_score?: number;
  max_possible_score?: number;
  dimension_scores?: DimensionScore[];
}

interface SelfAssessmentResultProps {
  scores: SelfAssessmentScores;
  createdAt?: string;
}

function getScoreColor(pct: number) {
  if (pct > 60) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
  if (pct >= 30) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
  return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
}

export function SelfAssessmentResult({ scores, createdAt }: SelfAssessmentResultProps) {
  const totalScore = Math.round(scores.total_score || 0);
  const maxScore = Math.round(scores.max_possible_score || 100);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const totalColor = getScoreColor(percentage);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 종합 점수 */}
        <div className="lg:col-span-5">
          <div className="h-full p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-medium text-gray-500 mb-3">종합 점수</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-gray-900">{totalScore}</span>
              <span className="text-lg text-gray-400 mb-1">/ {maxScore}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
              <div
                className={`h-2.5 rounded-full ${totalColor.bg} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${totalColor.light} ${totalColor.text}`}>
                {percentage}%
              </span>
              {createdAt && (
                <span className="text-xs text-gray-400">
                  {new Date(createdAt).toLocaleDateString('ko-KR')} 진단
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 항목별 점수 */}
        {scores.dimension_scores && (
          <div className="lg:col-span-7">
            <div className="h-full p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">항목별 점수</h3>
              <div className="space-y-2.5">
                {scores.dimension_scores.map((ds) => {
                  const dimScore = Math.round(ds.score);
                  const dimMax = Math.round(ds.max_score);
                  const dimPct = Math.round((dimScore / dimMax) * 100);
                  const dimColor = getScoreColor(dimPct);

                  return (
                    <div key={ds.dimension} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-28 truncate">{ds.dimension}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${dimColor.bg}`}
                          style={{ width: `${dimPct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">{dimScore}/{dimMax}</span>
                      <span className={`text-sm font-medium w-12 text-right ${dimColor.text}`}>{dimPct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
