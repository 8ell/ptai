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

  // 이미 진행 중인 운동이 있는지 확인
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
    throw new Error('Failed to start workout');
  }

  revalidatePath('/workout');
  return { id: data.id };
}

// 세트 기록 추가
export async function addWorkoutSetAction(
  workoutId: string,
  values: z.infer<typeof workoutSetSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // 유효성 검사
  const validated = workoutSetSchema.safeParse(values);
  if (!validated.success) {
    return { error: 'Invalid data' };
  }

  const { error } = await supabase.from('workout_sets').insert({
    workout_id: workoutId,
    user_id: user.id,
    exercise_name: validated.data.exercise_name,
    set_number: validated.data.set_number,
    weight: validated.data.weight,
    reps: validated.data.reps,
    rpe: validated.data.rpe,
  });

  if (error) {
    console.error('Error adding set:', error);
    return { error: error.message };
  }

  revalidatePath(`/workout/${workoutId}`);
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