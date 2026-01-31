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
  revalidatePath('/dashboard');
  redirect(`/workout/summary/${workoutId}`);
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
  return data || [];
}

export async function getWorkoutSummary(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch Workout Data
  const { data: workout } = await supabase
    .from('workouts')
    .select(`*, workout_sets(*)`)
    .eq('id', workoutId)
    .single();
    
  if (!workout) return null;

  // 2. Check/Create Feedback
  let { data: feedback } = await supabase
    .from('workout_feedbacks')
    .select('*')
    .eq('workout_id', workoutId)
    .single();

  if (!feedback) {
     // Generate Mock AI Feedback
     const totalSets = workout.workout_sets?.length || 0;
     const totalVolume = workout.workout_sets?.reduce((acc: number, set: any) => acc + (set.weight * set.reps), 0) || 0;
     
     const messages = [
       "오늘도 해내셨군요! 꾸준함이 가장 큰 무기입니다. 🔥",
       `총 ${totalSets}세트를 완수하셨습니다. 정말 대단해요! 💪`,
       "근육통은 성장의 증거입니다. 푹 쉬고 내일 또 만나요! 😴",
       `오늘의 총 볼륨은 ${totalVolume}kg 입니다. 엄청난 무게를 들어올리셨네요! 🏋️‍♂️`
     ];
     const randomMsg = messages[Math.floor(Math.random() * messages.length)];

     const { data: newFeedback } = await supabase
       .from('workout_feedbacks')
       .insert({
         workout_id: workoutId,
         user_id: user.id,
         feedback_text: randomMsg,
         score: 90 + Math.floor(Math.random() * 10) // 90~99 Mock Score
       })
       .select()
       .single();
       
     feedback = newFeedback;
  }

  return { workout, feedback };
}
