'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { workoutLogSchema } from './schema';

export async function addWorkoutLogAction(
  values: z.infer<typeof workoutLogSchema>
) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { error: '인증되지 않은 사용자입니다.' };
	}

	const { error } = await supabase.from('workout_logs').insert({
		user_id: user.id,
		exercise_name: values.exercise_name,
		weight: values.weight,
		reps: values.reps,
		sets: values.sets,
		rpe: values.rpe,
		workout_date: values.workout_date.toISOString(),
	});

	if (error) {
		console.error('Error inserting workout log:', error);
		return { error: error.message };
	}

	revalidatePath('/workout');
	return { error: null, success: true };
}
