'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { onboardingSchema, OnboardingData } from './schema';

export async function submitOnboardingAction(data: OnboardingData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // 1. 사용자 목표 저장
  const { error: goalError } = await supabase.from('user_goals').upsert({
    user_id: user.id,
    height: data.height,
    current_weight: data.current_weight,
    target_weight: data.target_weight,
    current_muscle_mass: data.current_muscle_mass || null,
    target_muscle_mass: data.target_muscle_mass || null,
    start_date: new Date().toISOString(),
  });

  if (goalError) {
    console.error('Error saving goals:', goalError);
    return { error: '목표 저장 중 오류가 발생했습니다.' };
  }

  // 2. AI 운동 플랜 생성 (Real Gemini API)
  let planData;
  try {
    const { generateWorkoutPlan } = await import('@/lib/gemini');
    planData = await generateWorkoutPlan({
      height: data.height,
      current_weight: data.current_weight,
      target_weight: data.target_weight,
      current_muscle_mass: data.current_muscle_mass,
      target_muscle_mass: data.target_muscle_mass,
      gender: 'unknown', // 추후 입력받으면 추가
      goal: data.target_weight > data.current_weight ? 'bulk_up' : 'weight_loss'
    });
  } catch (error) {
    console.error('Gemini API failed, using fallback plan:', error);
    // Fallback Mock Plan
    const isBulking = data.target_weight > data.current_weight;
    planData = {
      split: '3_day_split',
      name: isBulking ? '기본 벌크업 3분할 (Fallback)' : '기본 다이어트 3분할 (Fallback)',
      description: 'AI 연결에 일시적인 문제가 있어 기본 추천 루틴을 제공합니다.',
      schedule: {
        mon: 'push', tue: 'pull', wed: 'legs', thu: 'rest', fri: 'push', sat: 'pull', sun: 'rest'
      },
      routines: {
        push: [
          { exercise: '벤치 프레스', sets: 4, reps: '10-12' },
          { exercise: '오버헤드 프레스', sets: 3, reps: '10-12' },
          { exercise: '푸쉬업', sets: 3, reps: 'Failure' }
        ],
        pull: [
          { exercise: '랫 풀 다운', sets: 4, reps: '10-12' },
          { exercise: '바벨 로우', sets: 3, reps: '10-12' },
          { exercise: '덤벨 컬', sets: 3, reps: '12-15' }
        ],
        legs: [
          { exercise: '스쿼트', sets: 4, reps: '10-12' },
          { exercise: '레그 프레스', sets: 3, reps: '12-15' },
          { exercise: '런지', sets: 3, reps: '12' }
        ]
      }
    };
  }

  const { error: planError } = await supabase.from('workout_plans').insert({
    user_id: user.id,
    plan_data: planData,
    is_active: true
  });

  if (planError) {
    console.error('Error saving plan:', planError);
    // 목표는 저장되었으므로 치명적이지 않음, 추후 다시 생성 가능하게 처리
  }

  return { success: true };
}

export async function checkUserGoalAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.from('user_goals').select('user_id').eq('user_id', user.id).single();
  return !!data;
}
