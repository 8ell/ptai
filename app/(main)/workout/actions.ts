'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { workoutSetSchema } from './schema';
import * as z from 'zod';

// 현재 진행 중인 운동 조회
export async function getActiveWorkout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

// 운동 시작
export async function startWorkoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const active = await getActiveWorkout();
  if (active) {
    return { id: active.id };
  }

  const todayTitle = `${new Date().toLocaleDateString()} 운동`;

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      title: todayTitle,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting workout:', error);
    throw new Error(`Failed to start workout: ${error.message} (Code: ${error.code})`);
  }

  revalidatePath('/workout');
  return { id: data.id };
}

// 세트 기록 추가 (수행 시간 포함)
export async function addWorkoutSetAction(
  workoutId: string,
  values: z.infer<typeof workoutSetSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const validated = workoutSetSchema.safeParse(values);
  if (!validated.success) {
    return { error: 'Invalid data' };
  }

  const { data, error } = await supabase.from('workout_sets').insert({
    workout_id: workoutId,
    user_id: user.id,
    exercise_name: validated.data.exercise_name,
    set_number: validated.data.set_number,
    weight: validated.data.weight,
    reps: validated.data.reps,
    rpe: validated.data.rpe,
    duration: validated.data.duration ?? 0,
    rest_time: 0, // 초기에는 0, 휴식 후 업데이트
  }).select().single();

  if (error) {
    console.error('Error adding set:', error);
    return { error: error.message };
  }

  revalidatePath(`/workout/${workoutId}`);
  // 방금 생성된 세트의 ID를 반환하여 휴식 시간 업데이트에 사용
  return { success: true, setId: data.id };
}

// 휴식 시간 업데이트 (세트 후 휴식)
export async function updateSetRestTimeAction(setId: string, restTime: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workout_sets')
    .update({ rest_time: restTime })
    .eq('id', setId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating rest time:', error);
    return { error: error.message };
  }
  
  revalidatePath('/workout'); // 전체 갱신이 필요할 수도 있음
  return { success: true };
}

// 운동 세트 목록 조회
export async function getWorkoutSets(workoutId: string) {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });

  return data || [];
}

// 특정 운동의 가장 최근 기록 조회 (이전 세션 포함)
export async function getLastExerciseLogAction(exerciseName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', user.id)
    .eq('exercise_name', exerciseName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

// 운동 종료
export async function finishWorkoutAction(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('workouts')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', workoutId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/workout');
  redirect('/workout');
}

// 최근 완료된 운동 조회 (3개)
export async function getRecentWorkouts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_sets (count)
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(3);

  return data || [];
}
