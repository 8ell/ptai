import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkUserGoalAction } from '../onboarding/actions';
import { getDashboardData } from './actions';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Dumbbell, Trophy, Quote, CheckCircle2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  // 1. Auth & Onboarding Check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasGoal = await checkUserGoalAction();
  if (!hasGoal) redirect('/onboarding');

  // 2. Fetch Data
  const dashboardData = await getDashboardData();
  if (!dashboardData) return null;

  const { goal, plan, history } = dashboardData;

  // D-Day Calculation
  const today = new Date();
  const targetDate = goal?.target_date ? new Date(goal.target_date) : null;
  const dDay = targetDate ? differenceInDays(targetDate, today) : null;

  // Plan Schedule Mapping (Simple: Mon->mon, etc.)
  const weekDayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = weekDayMap[today.getDay()];
  const todayRoutineType = plan?.schedule?.[todayKey]; // e.g., 'push', 'rest'
  const todayExercises = todayRoutineType && todayRoutineType !== 'rest' 
    ? plan?.routines?.[todayRoutineType] 
    : null;

  // Completed Dates for Calendar
  const completedDates = history
    .filter((h: any) => h.status === 'completed')
    .map((h: any) => new Date(h.started_at));

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Goal Status */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {user.user_metadata.full_name || '회원'}님! 👋</h1>
        <p className="text-muted-foreground">오늘도 목표를 향해 달려볼까요?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         {/* D-Day Card */}
         <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>목표 달성까지</span>
                {dDay !== null && (
                  <Badge variant={dDay <= 0 ? "destructive" : "default"} className="text-md px-3 py-1">
                    {dDay === 0 ? "D-Day" : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                현재 {goal?.current_weight}kg → 목표 {goal?.target_weight}kg
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-3 text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border">
                 <Quote className="w-4 h-4 text-primary opacity-50" />
                 <span>"시작이 반이다. 나머지는 끈기다."</span>
               </div>
            </CardContent>
         </Card>

         {/* Today's Routine Summary */}
         <Card className="border-2 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                오늘의 추천 운동
              </CardTitle>
              <CardDescription>
                {plan?.name || 'AI 추천 플랜'} ({todayRoutineType?.toUpperCase()})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayRoutineType === 'rest' ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                   오늘은 <b>휴식일</b>입니다. 😴<br/>충분한 수면과 영양 섭취에 집중하세요.
                </div>
              ) : todayExercises ? (
                <ul className="space-y-2">
                  {todayExercises.slice(0, 3).map((ex: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <span className="font-medium">{ex.exercise}</span>
                      <span className="text-xs text-muted-foreground">{ex.sets}세트 x {ex.reps}회</span>
                    </li>
                  ))}
                  {todayExercises.length > 3 && (
                     <li className="text-xs text-center text-muted-foreground pt-1">+ {todayExercises.length - 3}개 더보기</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">오늘 예정된 운동이 없습니다.</p>
              )}
            </CardContent>
            <CardFooter className="pt-0">
               {todayRoutineType !== 'rest' && (
                 <Button className="w-full" asChild>
                   <a href="/workout">운동 시작하기</a>
                 </Button>
               )}
            </CardFooter>
         </Card>
      </div>

      {/* 2. Calendar Section */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <CalendarIcon className="w-5 h-5" />
               운동 일정
             </CardTitle>
           </CardHeader>
           <CardContent className="flex justify-center">
             {/* 
               TODO: Calendar 컴포넌트의 modifiers를 활용해 점 표시.
               현재 shadcn/ui calendar는 기본적으로 react-day-picker를 래핑함.
               커스텀 렌더링을 위해서는 components prop 등을 사용해야 함.
               일단은 기본 선택 상태로 완료된 날짜 표시.
             */}
             <Calendar
                mode="multiple"
                selected={completedDates}
                className="rounded-md border shadow-sm w-full max-w-sm"
                locale={ko} // 한국어 설정
                modifiers={{
                   booked: (date) => {
                      // 계획된 운동이 있는 날 (휴식일 제외)
                      const dayKey = weekDayMap[date.getDay()];
                      return plan?.schedule?.[dayKey] !== 'rest';
                   }
                }}
                modifiersStyles={{
                   booked: { textDecoration: "underline", textDecorationColor: "hsl(var(--primary))", textDecorationStyle: "dotted" }
                }}
             />
           </CardContent>
           <CardFooter className="flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                완료됨
              </div>
              <div className="flex items-center gap-1">
                 <span className="underline decoration-dotted decoration-primary">12</span>
                 계획됨
              </div>
           </CardFooter>
        </Card>
      </div>
      
    </div>
  );
}