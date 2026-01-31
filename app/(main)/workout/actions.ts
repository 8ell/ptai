"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

// Schema for workout log form validation
export const workoutLogSchema = z.object({
  exercise_name: z.string().min(1, { message: "운동 이름을 입력해주세요." }),
  weight: z.coerce.number().min(0).optional(),
  reps: z.coerce.number().min(0).optional(),
  sets: z.coerce.number().min(0).optional(),
  rpe: z.coerce.number().min(1).max(10).optional(),
  workout_date: z.date(),
});

export async function addWorkoutLogAction(
  values: z.infer<typeof workoutLogSchema>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "인증되지 않은 사용자입니다." };
  }

  const { error } = await supabase.from("workout_logs").insert({
    user_id: user.id,
    exercise_name: values.exercise_name,
    weight: values.weight,
    reps: values.reps,
    sets: values.sets,
    rpe: values.rpe,
    workout_date: values.workout_date.toISOString(),
  });

  if (error) {
    console.error("Error inserting workout log:", error);
    return { error: error.message };
  }

  revalidatePath("/workout");
  return { error: null, success: true };
}
