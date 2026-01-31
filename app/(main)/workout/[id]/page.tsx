import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWorkoutSets } from '../actions';
import { ActiveWorkoutView } from './active-workout-view';
import { WorkoutSession, WorkoutSet } from '../schema';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ActiveWorkoutPage(props: PageProps) {
  const params = await props.params;
  const { id } = params;
  
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 운동 세션 정보 가져오기
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !workout) {
    return notFound();
  }

  // 본인 확인 (RLS가 있지만 한번 더 체크)
  if (workout.user_id !== user.id) {
    return notFound();
  }

  // 이미 종료된 운동이라면? -> 조회 모드로 보여주거나 대시보드로 리다이렉트
  // 여기서는 '완료된 운동'도 볼 수 있게 하되, ActiveView가 어떻게 처리할지 결정해야 함.
  // 일단 ActiveView는 'status'를 체크해서 종료된 경우 폼을 숨기는 등의 처리가 필요할 수 있음.
  // 현재는 단순하게 진행.

  // 세트 기록 가져오기
  const setsData = await getWorkoutSets(id);
  
  // 타입 캐스팅 (DB 결과를 Zod 타입에 맞춤)
  const sets: WorkoutSet[] = setsData.map((s: any) => ({
    id: s.id,
    workout_id: s.workout_id,
    exercise_name: s.exercise_name,
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe,
    set_number: s.set_number,
    created_at: s.created_at,
  }));

  return (
    <ActiveWorkoutView 
      workout={workout as WorkoutSession} 
      initialSets={sets} 
    />
  );
}
