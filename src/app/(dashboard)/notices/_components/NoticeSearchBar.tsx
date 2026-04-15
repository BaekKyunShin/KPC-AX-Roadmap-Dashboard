'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function NoticeSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState<string>(searchParams.get('q') ?? '');
  const [filterBy, setFilterBy] = useState<'title' | 'author'>(
    (searchParams.get('filter_by') as 'title' | 'author') ?? 'title',
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('filter_by', filterBy);
    params.set('page', '1');
    startTransition(() => {
      router.push(`/notices?${params.toString()}`);
    });
  }

  function handleReset() {
    setQ('');
    setFilterBy('title');
    startTransition(() => {
      router.push('/notices');
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border bg-white p-4 sm:flex-row sm:items-end"
      data-testid="notice-search-bar"
    >
      <div className="w-full sm:w-36">
        <Label htmlFor="filter_by" className="text-xs text-muted-foreground">
          필터
        </Label>
        <Select
          value={filterBy}
          onValueChange={(v) => setFilterBy(v as 'title' | 'author')}
        >
          <SelectTrigger id="filter_by" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">제목</SelectItem>
            <SelectItem value="author">작성자</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="q" className="text-xs text-muted-foreground">
          검색어
        </Label>
        <Input
          id="q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={filterBy === 'title' ? '제목 검색' : '작성자 이름 검색'}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="gap-1.5">
          <Search className="h-4 w-4" />
          검색
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
        >
          초기화
        </Button>
      </div>
    </form>
  );
}
