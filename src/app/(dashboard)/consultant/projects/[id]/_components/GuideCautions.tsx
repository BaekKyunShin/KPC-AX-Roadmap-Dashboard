import { AlertTriangle } from 'lucide-react';

interface GuideCautionsProps {
  cautions: string[];
}

export function GuideCautions({ cautions }: GuideCautionsProps) {
  if (cautions.length === 0) return null;

  return (
    <div className="space-y-2">
      {cautions.map((caution, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-gray-700">{caution}</p>
        </div>
      ))}
    </div>
  );
}
