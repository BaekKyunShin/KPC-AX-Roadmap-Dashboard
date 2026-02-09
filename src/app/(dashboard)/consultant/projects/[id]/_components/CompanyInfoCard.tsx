import {
  Building2,
  Factory,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquareText,
  type LucideIcon,
} from 'lucide-react';

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

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <dt className="w-14 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-base font-medium text-gray-900 truncate">{value}</dd>
    </div>
  );
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
      <h2 className="text-lg font-semibold text-gray-900 mb-3">기업 정보</h2>

      <dl>
        <InfoRow icon={Building2} label="회사명" value={companyName} />
        <InfoRow icon={Factory} label="업종" value={industry} />
        <InfoRow icon={Users} label="규모" value={companySizeLabel} />
      </dl>

      <hr className="my-2 border-gray-100" />

      <dl>
        <InfoRow icon={User} label="담당자" value={contactName} />
        <InfoRow icon={Mail} label="연락처" value={contactEmail} />
        {contactPhone && (
          <InfoRow icon={Phone} label="전화" value={contactPhone} />
        )}
        {companyAddress && (
          <InfoRow icon={MapPin} label="주소" value={companyAddress} />
        )}
      </dl>

      {customerComment && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquareText className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">고객 요청사항</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2">
            {customerComment}
          </p>
        </div>
      )}
    </div>
  );
}
