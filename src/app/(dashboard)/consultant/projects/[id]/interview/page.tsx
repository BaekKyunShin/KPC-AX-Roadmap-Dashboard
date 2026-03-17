import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchInterview } from './actions';
import InterviewClient from './_components/InterviewClient';

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. 인증 확인
  const user = await getCachedUser();
  if (!user) redirect('/login');

  // 2. 역할 확인 (CONSULTANT_APPROVED만)
  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  // 3. 인터뷰 데이터 프리페치
  const initialInterview = await fetchInterview(id);

  return <InterviewClient projectId={id} initialInterview={initialInterview} />;
}
