import { REASON_LENGTH } from './constants';

interface ReasonLengthHintProps {
  currentLength: number;
}

/**
 * 배정 사유 입력 글자수 힌트 컴포넌트
 * - 최소 글자수 미달 시 amber 색상으로 "X자 더 입력 필요" 표시
 * - 충족 시 green 색상으로 "입력 완료" 표시
 * - 우측에 현재/최대 글자수 표시
 */
export default function ReasonLengthHint({ currentLength }: ReasonLengthHintProps) {
  const isValid = currentLength >= REASON_LENGTH.MIN;
  const remainingChars = REASON_LENGTH.MIN - currentLength;

  return (
    <div className="mt-1 flex items-center justify-between text-xs">
      <span className={isValid ? 'text-green-600' : 'text-amber-600'}>
        {isValid ? '입력 완료' : `${remainingChars}자 더 입력 필요`}
      </span>
      <span className="text-gray-500">
        {currentLength}/{REASON_LENGTH.MAX}자
      </span>
    </div>
  );
}
