import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import {
  fetchAuditLogs,
  getActionTypes,
  getTargetTypes,
  fetchUsers,
  type AuditLogEntry,
} from './actions';
import AuditLogClient from './_components/AuditLogClient';
import { isOpsManager } from '@/lib/constants/status';

export default async function AuditLogPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const [logsResult, actionTypes, targetTypes, users] = await Promise.all([
    fetchAuditLogs({ page: 1, limit: 20 }),
    getActionTypes(),
    getTargetTypes(),
    fetchUsers(),
  ]);

  return (
    <AuditLogClient
      initialLogs={logsResult.logs as AuditLogEntry[]}
      initialTotal={logsResult.total}
      initialTotalPages={logsResult.totalPages}
      actionTypes={actionTypes}
      targetTypes={targetTypes}
      users={users}
    />
  );
}
