"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { goalFormSchema } from "./schema";

export async function updateGoalAction(values: z.infer<typeof goalFormSchema>) {
  const validated = goalFormSchema.safeParse(values);
  if (!validated.success) {
    return { error: "입력값이 올바르지 않습니다." };
  }
  
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "인증되지 않은 사용자입니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: validated.data.username,
      target_weight: validated.data.target_weight,
      goal_period_start: validated.data.goal_period_start.toISOString(),
      goal_period_end: validated.data.goal_period_end.toISOString(),
      // Ensure the id is set for the upsert operation if the profile is new
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/goals");
  return { error: null };
}
