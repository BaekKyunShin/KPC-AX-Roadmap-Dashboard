import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            KPC AI 훈련 로드맵 대시보드
          </h1>
          <p className="text-xl text-gray-600">
            기업 진단부터 맞춤형 AI 교육 로드맵까지
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">1</div>
            <h3 className="text-lg font-semibold mb-2">기업 진단</h3>
            <p className="text-gray-600 text-sm">
              30문항 자가진단으로 기업의 AI 활용 역량을 파악합니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">2</div>
            <h3 className="text-lg font-semibold mb-2">컨설턴트 매칭</h3>
            <p className="text-gray-600 text-sm">
              기업 특성에 맞는 최적의 컨설턴트를 추천하고 배정합니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">3</div>
            <h3 className="text-lg font-semibold mb-2">로드맵 생성</h3>
            <p className="text-gray-600 text-sm">
              현장 인터뷰 기반 맞춤형 AI 교육 로드맵을 생성합니다.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="space-x-4">
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="inline-block px-8 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              회원가입
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            본 시스템은 KPC AI 훈련 확산센터 내부용입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
