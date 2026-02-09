import {
  Building2,
  Factory,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquareText,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CompanyInfoCardProps {
  companyName: string;
  industry: string;
  companySizeLabel: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyAddress?: string | null;
  customerComment?: string | null;
}

export function CompanyInfoCard({
  companyName,
  industry,
  companySizeLabel,
  contactName,
  contactEmail,
  contactPhone,
  companyAddress,
  customerComment,
}: CompanyInfoCardProps) {
  return (
    <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">기업 정보</h2>

      {/* 회사명 */}
      <div className="flex items-start gap-3 mb-4">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div>
          <dt className="text-xs text-gray-500">회사명</dt>
          <dd className="text-sm font-semibold text-gray-900">{companyName}</dd>
        </div>
      </div>

      {/* 업종 · 규모 — 2열 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-3">
          <Factory className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">업종</dt>
            <dd className="text-sm font-medium text-gray-900">{industry}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">규모</dt>
            <dd className="text-sm font-medium text-gray-900">{companySizeLabel}</dd>
          </div>
        </div>
      </div>

      {/* 구분선 + 담당자 정보 */}
      <div className="relative my-5">
        <Separator />
        <span className="absolute -top-2.5 left-0 bg-white pr-3 text-xs font-medium text-gray-400">
          담당자 정보
        </span>
      </div>

      {/* 담당자 · 연락처 — 2열 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">담당자</dt>
            <dd className="text-sm font-medium text-gray-900">{contactName}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">연락처</dt>
            <dd className="text-sm font-medium text-gray-900">{contactEmail}</dd>
          </div>
        </div>
      </div>

      {/* 전화번호 (선택) */}
      {contactPhone && (
        <div className="flex items-start gap-3 mb-4">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">전화</dt>
            <dd className="text-sm font-medium text-gray-900">{contactPhone}</dd>
          </div>
        </div>
      )}

      {/* 주소 (선택) */}
      {companyAddress && (
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <dt className="text-xs text-gray-500">주소</dt>
            <dd className="text-sm font-medium text-gray-900">{companyAddress}</dd>
          </div>
        </div>
      )}

      {/* 고객 요청사항 (선택) */}
      {customerComment && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareText className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">고객 요청사항</span>
          </div>
          <div className="rounded-md bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {customerComment}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
