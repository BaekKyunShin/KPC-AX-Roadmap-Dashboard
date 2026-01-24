import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProjectList from './_components/ProjectList';

export default async function ConsultantProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 현재 사용자 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  return <ProjectList />;
}
