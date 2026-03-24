import { useEffect, useState } from 'react';
import {
  fetchProjectStats,
  fetchMonthlyCompletions,
  fetchConsultantProgress,
  fetchStalledProjects,
  type ProjectStats,
  type MonthlyCompletion,
  type ConsultantProgress,
  type StalledProject,
} from '../actions';

interface ProjectDashboardData {
  stats: ProjectStats | null;
  monthlyData: MonthlyCompletion[];
  consultantData: ConsultantProgress[];
  stalledProjects: StalledProject[];
  loading: boolean;
}

export function useProjectDashboard(initialStats?: ProjectStats | null): ProjectDashboardData {
  const [stats, setStats] = useState<ProjectStats | null>(initialStats ?? null);
  const [monthlyData, setMonthlyData] = useState<MonthlyCompletion[]>([]);
  const [consultantData, setConsultantData] = useState<ConsultantProgress[]>(
    []
  );
  const [stalledProjects, setStalledProjects] = useState<StalledProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (initialStats) {
          const [monthly, consultant, stalled] = await Promise.all([
            fetchMonthlyCompletions(),
            fetchConsultantProgress(),
            fetchStalledProjects(),
          ]);
          setMonthlyData(monthly);
          setConsultantData(consultant);
          setStalledProjects(stalled);
        } else {
          const [statsData, monthly, consultant, stalled] = await Promise.all([
            fetchProjectStats(),
            fetchMonthlyCompletions(),
            fetchConsultantProgress(),
            fetchStalledProjects(),
          ]);
          setStats(statsData);
          setMonthlyData(monthly);
          setConsultantData(consultant);
          setStalledProjects(stalled);
        }
      } catch (error) {
        console.error('[ProjectDashboard] 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [initialStats]);

  return { stats, monthlyData, consultantData, stalledProjects, loading };
}
