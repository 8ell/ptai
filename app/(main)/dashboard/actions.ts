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
