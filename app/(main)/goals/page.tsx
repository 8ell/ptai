import { createClient } from "@/lib/supabase/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { GoalForm } from "./goal-form";

// Server Component: The main page that fetches data
export default async function GoalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // This should not happen due to middleware, but as a fallback
    return <div>로그인이 필요합니다.</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, target_weight, goal_period_start, goal_period_end")
    .eq("id", user.id)
    .single();

  // Prepare a default profile object for new users or if profile is incomplete
  const existingProfile = profile || {
    username: user.email?.split("@")[0] ?? "",
    target_weight: null,
    goal_period_start: null,
    goal_period_end: null,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>목표 설정</CardTitle>
          <CardDescription>
            목표 체중과 기간을 설정하여 동기를 부여하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalForm profile={existingProfile} />
        </CardContent>
      </Card>
      <Toaster richColors />
    </>
  );
}