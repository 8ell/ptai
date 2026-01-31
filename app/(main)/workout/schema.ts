import * as z from 'zod';

export const workoutLogSchema = z.object({
	exercise_name: z.string().min(1, { message: '운동 이름을 입력해주세요.' }),
	weight: z.coerce.number().min(0).optional(),
	reps: z.coerce.number().min(0).optional(),
	sets: z.coerce.number().min(0).optional(),
	rpe: z.coerce.number().min(1).max(10).optional(),
	workout_date: z.date(),
});
