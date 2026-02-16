import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-900">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium transition-colors hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
