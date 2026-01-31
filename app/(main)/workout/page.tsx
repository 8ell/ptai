import { Suspense } from 'react';
import { getActiveWorkout, startWorkoutAction, getRecentWorkouts } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Play, ChevronRight, History, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default async function WorkoutPage() {
  const activeWorkout = await getActiveWorkout();
  const recentWorkouts = await getRecentWorkouts();

  async function startWorkout() {
    'use server';
    const { id } = await startWorkoutAction();
    redirect(`/workout/${id}`);
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">운동 기록</h1>
        <p className="text-muted-foreground">오늘의 운동을 기록하고 관리하세요.</p>
      </div>

      {/* Active Workout Card */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {activeWorkout ? '진행 중인 운동' : '오늘의 운동'}
          </CardTitle>
          <CardDescription>
            {activeWorkout 
              ? `${new Date(activeWorkout.started_at).toLocaleTimeString()}에 시작됨` 
              : '새로운 운동 세션을 시작하세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeWorkout ? (
            <Link href={`/workout/${activeWorkout.id}`}>
              <Button size="lg" className="w-full text-lg h-14" variant="default">
                <Play className="mr-2 h-5 w-5 fill-current" />
                운동 계속하기
              </Button>
            </Link>
          ) : (
            <form action={startWorkout}>
              <Button size="lg" className="w-full text-lg h-14" type="submit">
                <Play className="mr-2 h-5 w-5 fill-current" />
                운동 시작하기
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="h-4 w-4" />
          최근 기록
        </h2>
        {recentWorkouts.length > 0 ? (
           <div className="space-y-3">
             {recentWorkouts.map((workout: any) => (
               <Card key={workout.id} className="bg-muted/30">
                 <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="font-medium flex items-center gap-2">
                         <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                         {format(new Date(workout.started_at), 'M월 d일 (eee)', { locale: ko })}
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {format(new Date(workout.started_at), 'HH:mm')} 종료
                         {' • '}
                         {workout.workout_sets[0]?.count || 0} 세트
                       </p>
                    </div>
                    {/* 상세 보기 버튼이나 링크가 있으면 좋음. 현재는 대시보드 달력에서 확인 가능 */}
                    {/* <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button> */}
                 </CardContent>
               </Card>
             ))}
           </div>
        ) : (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>아직 완료된 운동 기록이 없습니다.</p>
              <p className="text-sm">운동을 완료하면 여기에 표시됩니다.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
