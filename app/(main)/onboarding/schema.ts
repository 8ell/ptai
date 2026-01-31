import * as z from 'zod';

export const onboardingSchema = z.object({
  height: z.coerce.number().min(100).max(250),
  current_weight: z.coerce.number().min(30).max(200),
  target_weight: z.coerce.number().min(30).max(200),
  current_muscle_mass: z.coerce.number().optional().nullable(),
  target_muscle_mass: z.coerce.number().optional().nullable(),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
