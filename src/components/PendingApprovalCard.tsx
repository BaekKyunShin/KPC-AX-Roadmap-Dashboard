import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Mail,
  Phone,
  HelpCircle,
  Briefcase,
  Shield,
  Edit,
} from 'lucide-react';

interface PendingApprovalCardProps {
  userName: string;
  userEmail?: string;
  userRole: 'CONSULTANT' | 'OPS_ADMIN';
  hasProfile?: boolean;
}

// 컨설턴트 진행 단계
const CONSULTANT_STEPS = [
  { id: 1, label: '가입 완료', icon: CheckCircle2, status: 'completed' },
  { id: 2, label: '프로필 검토', icon: FileCheck, status: 'current' },
  { id: 3, label: '승인 완료', icon: CheckCircle2, status: 'pending' },
  { id: 4, label: '서비스 이용', icon: Sparkles, status: 'pending' },
];

// 운영관리자 진행 단계
const OPS_ADMIN_STEPS = [
  { id: 1, label: '가입 완료', icon: CheckCircle2, status: 'completed' },
  { id: 2, label: '관리자 승인', icon: Shield, status: 'current' },
  { id: 3, label: '서비스 이용', icon: Sparkles, status: 'pending' },
];

export default function PendingApprovalCard({
  userName,
  userRole,
  hasProfile = false,
}: PendingApprovalCardProps) {
  const isConsultant = userRole === 'CONSULTANT';
  const steps = isConsultant ? CONSULTANT_STEPS : OPS_ADMIN_STEPS;

  return (
    <div className="space-y-6">
      {/* 메인 카드 */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-900">승인 대기 중입니다</CardTitle>
              <CardDescription className="text-amber-700">
                {isConsultant ? '프로필 검토가 진행 중이에요' : '관리자 승인이 진행 중이에요'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 환영 메시지 */}
          <div className="rounded-lg bg-white/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-gray-700">
                안녕하세요, <span className="font-semibold text-amber-900">{userName}</span>
                님!
              </p>
              <Badge variant="outline" className={isConsultant ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                {isConsultant ? (
                  <>
                    <Briefcase className="h-3 w-3 mr-1" />
                    컨설턴트
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    운영관리자
                  </>
                )}
              </Badge>
            </div>
            <p className="text-base text-gray-600">
              {isConsultant
                ? '회원가입이 완료되었습니다. 관리자가 프로필을 검토할 예정이며, 승인이 완료되면 AI 훈련 로드맵 생성 기능을 이용하실 수 있습니다.'
                : '회원가입이 완료되었습니다. 시스템 관리자가 승인하면 케이스 관리 및 사용자 관리 기능을 이용하실 수 있습니다.'}
            </p>
          </div>

          {/* 컨설턴트이고 프로필이 있는 경우 프로필 수정 버튼 */}
          {isConsultant && hasProfile && (
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">프로필 수정</h4>
                  <p className="text-sm text-blue-700">승인 대기 중에도 프로필을 수정할 수 있습니다.</p>
                </div>
                <Link href="/dashboard/profile">
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100">
                    <Edit className="h-4 w-4 mr-2" />
                    프로필 수정
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* 진행 단계 */}
          <div className="py-2">
            <h4 className="mb-4 text-base font-medium text-gray-700">진행 상태</h4>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          isCompleted
                            ? 'border-green-500 bg-green-500 text-white'
                            : isCurrent
                              ? 'border-amber-500 bg-amber-500 text-white animate-pulse'
                              : 'border-gray-300 bg-white text-gray-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`mt-2 text-sm font-medium ${
                          isCompleted
                            ? 'text-green-600'
                            : isCurrent
                              ? 'text-amber-600'
                              : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 예상 정보 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/80">
              <Clock className="mr-1 h-3 w-3" />
              영업일 기준 2~3일 소요
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 도움말 카드 */}
      <Card className="border-gray-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <HelpCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-gray-900">도움이 필요하신가요?</h4>
              <p className="mt-1 text-base text-gray-500">
                승인 관련 문의가 있는 경우, 운영 담당자에게 연락해 주세요.
              </p>
              <Separator className="my-3" />
              <div className="flex flex-wrap gap-4 text-base">
                <a
                  href="mailto:ykkim@kpc.or.kr"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  ykkim@kpc.or.kr
                </a>
                <a
                  href="tel:02-398-4311"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  02-398-4311
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
