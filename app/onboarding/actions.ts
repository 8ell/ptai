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
  // 사용자의 목표에 따라 분할법과 루틴을 다르게 추천
  let planType = '3_day_split';
  let planName = 'AI 추천: 3분할 (Push/Pull/Legs)';
  let description = '전신을 효율적으로 발달시키는 가장 대중적인 분할법입니다.';
  let schedule: any = {
      mon: 'push', tue: 'pull', wed: 'legs', thu: 'rest', fri: 'push', sat: 'pull', sun: 'rest'
  };

  const isBulking = data.target_weight > data.current_weight;
  
  if (isBulking) {
      planName = 'AI 추천: 벌크업 4분할 루틴';
      description = '근비대를 극대화하기 위해 부위별 휴식과 강도를 조절한 루틴입니다.';
      planType = '4_day_split';
      schedule = {
          mon: 'chest_triceps', tue: 'back_biceps', wed: 'rest', thu: 'shoulders_abs', fri: 'legs', sat: 'rest', sun: 'rest'
      };
      // ... 루틴 데이터도 확장이 필요하지만, 일단 기존 3분할 구조를 유지하거나 매핑을 수정해야 함.
      // 복잡성을 피하기 위해 이번 예시에서는 3분할을 베이스로 텍스트만 변경하거나, 
      // 간단히 3분할로 통일하되 목표에 따라 설명을 다르게 함.
      
      // 실제 구현시에는 Gemini API를 호출하여 전체 JSON을 받아와야 함.
      // 여기서는 3분할로 통일하되 강도 설명을 변경.
      planName = 'AI 추천: 강력한 근성장 3분할';
      description = '목표 골격근량 달성을 위해 고중량 저반복 위주의 3분할 루틴을 제안합니다.';
  } else {
      planName = 'AI 추천: 체지방 감소 3분할';
      description = '목표 체중 달성을 위해 높은 운동량과 유산소성 근력 운동을 결합했습니다.';
  }

  const mockPlan = {
    split: planType,
    name: planName,
    description: description,
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
        { exercise: '벤치 프레스', sets: 4, reps: isBulking ? '8-10' : '12-15' },
        { exercise: '오버헤드 프레스', sets: 4, reps: isBulking ? '8-10' : '12-15' },
        { exercise: '인클라인 덤벨 프레스', sets: 3, reps: isBulking ? '10' : '15' },
        { exercise: '푸쉬업', sets: 3, reps: 'Failure' }
      ],
      pull: [
        { exercise: '데드리프트', sets: 3, reps: isBulking ? '6-8' : '10-12' },
        { exercise: '풀업', sets: 3, reps: 'Failure' },
        { exercise: '바벨 로우', sets: 4, reps: isBulking ? '8-10' : '12-15' },
        { exercise: '페이스 풀', sets: 3, reps: 15 }
      ],
      legs: [
        { exercise: '스쿼트', sets: 4, reps: isBulking ? '8-10' : '12-15' },
        { exercise: '런지', sets: 3, reps: 12 },
        { exercise: '레그 익스텐션', sets: 3, reps: 15 },
        { exercise: '카프 레이즈', sets: 4, reps: 20 }
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
