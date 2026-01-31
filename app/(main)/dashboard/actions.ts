'use server';

import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. 사용자 목표 (D-Day)
  const { data: goal } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // 2. 활성 운동 플랜
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 3. 이번 달 운동 기록 (완료 여부 확인용)
  // 현재 날짜 기준 전후 1달 정도 가져옴
  const now = new Date();
  const start = startOfMonth(now).toISOString();
  const end = endOfMonth(now).toISOString();

  const { data: history } = await supabase
    .from('workouts')
    .select('id, started_at, status, title')
    .eq('user_id', user.id)
    .gte('started_at', start)
    .lte('started_at', end);

  return {
    goal,
    plan: plan?.plan_data, // JSON 데이터
    history: history || [],
    user
  };
}

export async function getWorkoutByDate(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 해당 날짜(00:00 ~ 23:59)의 운동 기록 조회
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_sets (
        *
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('started_at', startOfDay.toISOString())
    .lte('started_at', endOfDay.toISOString())
    .order('started_at', { ascending: false });

  return workouts;
}
