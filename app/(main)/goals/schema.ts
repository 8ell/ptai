import * as z from 'zod';

export const goalFormSchema = z.object({
	username: z.string().min(2, '사용자 이름은 2자 이상이어야 합니다.'),
	target_weight: z.coerce.number().positive('목표 체중은 0보다 커야 합니다.'),
	goal_period_start: z.date(),
	goal_period_end: z.date(),
});
