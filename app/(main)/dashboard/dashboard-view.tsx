'use client';

import { useState, useTransition } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Dumbbell, Quote, Loader2, Clock, ChevronRight } from 'lucide-react';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { getWorkoutByDate } from './actions';

interface DashboardViewProps {
  user: any;
  goal: any;
  plan: any;
  history: any[];
  recentWorkouts: any[];
}

export function DashboardView({ user, goal, plan, history, recentWorkouts }: DashboardViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dayWorkouts, setDayWorkouts] = useState<any[]>([]);
  const [isLoading, startTransition] = useTransition();

  // D-Day
  const today = new Date();
  const targetDate = goal?.target_date ? new Date(goal.target_date) : null;
  const dDay = targetDate ? differenceInDays(targetDate, today) : null;

  // Plan Schedule
  const weekDayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = weekDayMap[today.getDay()];
  const todayRoutineType = plan?.schedule?.[todayKey];
  const todayExercises = todayRoutineType && todayRoutineType !== 'rest' 
    ? plan?.routines?.[todayRoutineType] 
    : null;

  // Completed Dates
  const completedDates = history
    .filter((h: any) => h.status === 'completed')
    .map((h: any) => new Date(h.started_at));

  // Handle Date Click
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    // 해당 날짜에 완료된 운동이 있는지 확인 (history prop 활용)
    // 달력에는 이번달 데이터만 있지만, 클릭 시 전체 조회를 위해 active fetch를 수행하므로
    // history prop 체크는 UI 피드백용으로만 쓰고 실제 데이터는 서버 액션으로 가져옴.
    
    startTransition(async () => {
      const workouts = await getWorkoutByDate(date.toISOString());
      setDayWorkouts(workouts || []);
      setIsDialogOpen(true);
    });
  };

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

      {/* 2. Calendar & Recent History Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <CalendarIcon className="w-5 h-5" />
               운동 일정
             </CardTitle>
             <CardDescription>완료된 날짜를 누르면 기록을 볼 수 있어요.</CardDescription>
           </CardHeader>
           <CardContent className="flex justify-center">
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border shadow-sm w-full max-w-sm"
                locale={ko}
                modifiers={{
                   booked: (date) => {
                      const dayKey = weekDayMap[date.getDay()];
                      return plan?.schedule?.[dayKey] !== 'rest';
                   },
                   completed: (date) => {
                      return completedDates.some(d => d.toDateString() === date.toDateString());
                   }
                }}
                modifiersStyles={{
                   booked: { textDecoration: "underline", textDecorationColor: "hsl(var(--primary))", textDecorationStyle: "dotted" },
                   completed: { fontWeight: "bold", color: "hsl(var(--primary))", backgroundColor: "hsl(var(--primary) / 0.1)" }
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

        {/* Recent History Section */}
        <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                 <Clock className="w-5 h-5" />
                 최근 운동 기록
              </CardTitle>
              <CardDescription>
                 최근 완료한 운동 세션입니다.
              </CardDescription>
           </CardHeader>
           <CardContent>
              {recentWorkouts.length > 0 ? (
                 <div className="space-y-4">
                    {recentWorkouts.map((workout) => (
                       <div 
                         key={workout.id} 
                         className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                         onClick={() => {
                            handleDateSelect(new Date(workout.started_at));
                         }}
                       >
                          <div className="space-y-1">
                             <div className="font-medium text-sm">{workout.title || '운동 세션'}</div>
                             <div className="text-xs text-muted-foreground">
                                {format(new Date(workout.started_at), 'PPP (eee)', { locale: ko })}
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="text-center py-8 text-muted-foreground">
                    아직 완료된 운동이 없습니다.<br/>
                    첫 운동을 시작해보세요!
                 </div>
              )}
           </CardContent>
        </Card>
      </div>

      {/* Workout History Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? format(selectedDate, 'M월 d일') : ''} 운동 기록
            </DialogTitle>
            <DialogDescription>
              수행한 운동 내역입니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
             {isLoading ? (
               <div className="flex justify-center py-8">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
               </div>
             ) : dayWorkouts.length > 0 ? (
               dayWorkouts.map((workout: any) => (
                 <div key={workout.id} className="space-y-3">
                   <div className="flex justify-between items-center border-b pb-2">
                     <h3 className="font-semibold">{workout.title || '운동 세션'}</h3>
                     <span className="text-xs text-muted-foreground">
                       {format(new Date(workout.started_at), 'HH:mm')} ~ {workout.ended_at ? format(new Date(workout.ended_at), 'HH:mm') : ''}
                     </span>
                   </div>
                   
                   {/* Group sets by exercise */}
                   {Object.entries(workout.workout_sets.reduce((acc: any, set: any) => {
                      if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
                      acc[set.exercise_name].push(set);
                      return acc;
                   }, {})).map(([name, sets]: [string, any]) => (
                     <div key={name} className="bg-muted/50 p-3 rounded-lg text-sm">
                        <div className="font-medium mb-1">{name}</div>
                        <div className="space-y-1">
                          {sets.map((set: any) => (
                             <div key={set.id} className="flex justify-between text-muted-foreground text-xs">
                               <span>{set.set_number}세트: {set.weight}kg x {set.reps}회</span>
                               <span>{set.duration > 0 ? `${set.duration}초` : ''}</span>
                             </div>
                          ))}
                        </div>
                     </div>
                   ))}
                 </div>
               ))
             ) : (
               <div className="text-center py-4 text-muted-foreground">
                 기록을 불러올 수 없습니다.
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
