import { createClient } from "@/lib/supabase/server";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddWorkoutLogDialog } from "./add-workout-form";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export const revalidate = 0;

export default async function WorkoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  const { data: workoutLogs, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workout logs:", error);
    // You could show a proper error component here
    return <div>운동 기록을 불러오는 중 오류가 발생했습니다.</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle>운동 기록</CardTitle>
          <CardDescription>
            당신의 모든 노력을 기록하고 관리하세요.
          </CardDescription>
        </div>
        <AddWorkoutLogDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">날짜</TableHead>
              <TableHead>운동</TableHead>
              <TableHead className="text-right">무게 (kg)</TableHead>
              <TableHead className="text-right">횟수</TableHead>
              <TableHead className="text-right">세트</TableHead>
              <TableHead className="text-right">RPE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workoutLogs && workoutLogs.length > 0 ? (
              workoutLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {format(new Date(log.workout_date), "yy/MM/dd (eee)", { locale: ko })}
                  </TableCell>
                  <TableCell>{log.exercise_name}</TableCell>
                  <TableCell className="text-right">{log.weight ?? "-"}</TableCell>
                  <TableCell className="text-right">{log.reps ?? "-"}</TableCell>
                  <TableCell className="text-right">{log.sets ?? "-"}</TableCell>
                  <TableCell className="text-right">{log.rpe ?? "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  아직 운동 기록이 없습니다. 첫 기록을 추가해보세요!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
           <TableCaption>최근 운동 기록 목록입니다.</TableCaption>
        </Table>
      </CardContent>
    </Card>
  );
}
