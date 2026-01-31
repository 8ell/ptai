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

  // 2. AI 운동 플랜 생성 (Mock Logic)
  // 실제로는 여기서 Gemini API 등을 호출하여 개인화된 루틴을 받아와야 함.
  // 지금은 간단한 "3분할 루틴"을 생성하여 저장.
  
  const mockPlan = {
    split: '3_day_split',
    name: 'AI 추천: 기초 근력 강화 3분할',
    description: '체중 조절과 근력 향상을 위한 효율적인 3분할 루틴입니다.',
    schedule: {
      mon: 'push',
      tue: 'pull',
      wed: 'legs',
      thu: 'rest',
      fri: 'push',
      sat: 'pull',
      sun: 'rest'
    },
    routines: {
      push: [
        { exercise: '벤치 프레스', sets: 3, reps: 10 },
        { exercise: '오버헤드 프레스', sets: 3, reps: 12 },
        { exercise: '푸쉬업', sets: 3, reps: 15 }
      ],
      pull: [
        { exercise: '데드리프트', sets: 3, reps: 5 },
        { exercise: '풀업', sets: 3, reps: 8 },
        { exercise: '덤벨 로우', sets: 3, reps: 12 }
      ],
      legs: [
        { exercise: '스쿼트', sets: 3, reps: 8 },
        { exercise: '런지', sets: 3, reps: 12 },
        { exercise: '레그 익스텐션', sets: 3, reps: 15 }
      ]
    }
  };

  const { error: planError } = await supabase.from('workout_plans').insert({
    user_id: user.id,
    plan_data: mockPlan,
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
