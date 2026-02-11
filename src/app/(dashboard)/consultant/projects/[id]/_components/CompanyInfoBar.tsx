import {
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquareText,
} from 'lucide-react';

interface CompanyInfoBarProps {
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyAddress?: string | null;
  customerComment?: string | null;
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 truncate">{value}</span>
    </div>
  );
}

export function CompanyInfoBar({
  contactName,
  contactEmail,
  contactPhone,
  companyAddress,
  customerComment,
}: CompanyInfoBarProps) {
  return (
    <div className="rounded-lg border bg-white px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <InfoItem icon={User} label="담당자" value={contactName} />
        <InfoItem icon={Mail} label="이메일" value={contactEmail} />
        {contactPhone && (
          <InfoItem icon={Phone} label="전화" value={contactPhone} />
        )}
        {companyAddress && (
          <InfoItem icon={MapPin} label="주소" value={companyAddress} />
        )}
      </div>

      {customerComment && (
        <div className="mt-2 flex items-start gap-2 border-t border-gray-100 pt-2">
          <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <p className="text-sm text-gray-600 line-clamp-2">{customerComment}</p>
        </div>
      )}
    </div>
  );
}
