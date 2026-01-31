import * as z from 'zod';

// 운동 세션 스키마
export const workoutSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  status: z.enum(['in_progress', 'completed']),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
});

// 운동 세트 기록 스키마 (Form용)
export const workoutSetSchema = z.object({
  exercise_name: z.string().min(1, { message: '운동 이름을 입력해주세요.' }),
  weight: z.coerce.number().min(0, { message: '무게는 0 이상이어야 합니다.' }),
  reps: z.coerce.number().min(1, { message: '횟수는 1회 이상이어야 합니다.' }),
  rpe: z.coerce.number().min(0).max(10).optional(),
  set_number: z.coerce.number().min(1),
});

export type WorkoutSession = z.infer<typeof workoutSessionSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema> & {
  id: string;
  workout_id: string;
  created_at: string;
};