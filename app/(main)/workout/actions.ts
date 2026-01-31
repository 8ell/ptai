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
     const duration = workout.ended_at ? (new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 1000 / 60 : 0; // minutes
     
     // Extract main exercises (most sets)
     const exerciseCounts: {[key: string]: number} = {};
     workout.workout_sets?.forEach((s: any) => {
         exerciseCounts[s.exercise_name] = (exerciseCounts[s.exercise_name] || 0) + 1;
     });
     const mainExercise = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

     let feedbackText = "";
     let score = 85;

     if (totalSets === 0) {
         feedbackText = "운동 기록이 충분하지 않네요. 다음번엔 조금 더 힘내볼까요? 😅";
         score = 50;
     } else {
         const parts = [];
         
         // Intro
         if (duration > 60) parts.push("정말 긴 시간 동안 고생하셨습니다! 끈기가 대단해요. 🔥");
         else if (duration < 20) parts.push("짧고 굵게! 효율적인 운동이었습니다. ⚡️");
         else parts.push("오늘도 목표를 위해 땀 흘린 당신, 정말 멋집니다! 👍");

         // Volume & Intensity
         if (totalVolume > 5000) {
             parts.push(`총 볼륨 ${totalVolume.toLocaleString()}kg! 엄청난 강도였습니다. 근성장이 기대되네요.`);
             score += 10;
         } else {
             parts.push(`총 ${totalSets}세트를 깔끔하게 완수하셨군요.`);
             score += 5;
         }

         // Specific Exercise
         if (mainExercise) {
             parts.push(`특히 '${mainExercise}'에 집중한 모습이 인상적입니다.`);
         }

         // Outro
         parts.push("푹 쉬고 맛있는 단백질 섭취 잊지 마세요! 🍗");
         
         feedbackText = parts.join(" ");
         score = Math.min(100, score + Math.floor(Math.random() * 5));
     }

     const { data: newFeedback } = await supabase
       .from('workout_feedbacks')
       .insert({
         workout_id: workoutId,
         user_id: user.id,
         feedback_text: feedbackText,
         score: score
       })
       .select()
       .single();
       
     feedback = newFeedback;
  }

  return { workout, feedback };
}
