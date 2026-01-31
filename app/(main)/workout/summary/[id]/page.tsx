import { getWorkoutSummary } from '../../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Clock, Dumbbell, Zap, CheckCircle2, Home } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSummaryPage(props: PageProps) {
  const params = await props.params;
  const { workout, feedback } = await getWorkoutSummary(params.id) || {};

  if (!workout) {
     redirect('/workout');
  }

  // Calculate Stats
  const startDate = new Date(workout.started_at);
  const endDate = workout.ended_at ? new Date(workout.ended_at) : new Date();
  const durationMinutes = differenceInMinutes(endDate, startDate);
  
  const totalSets = workout.workout_sets.length;
  const totalVolume = workout.workout_sets.reduce((acc: number, set: any) => acc + (set.weight * set.reps), 0);
  
  // Best Set (Max Weight)
  const maxWeight = Math.max(...workout.workout_sets.map((s: any) => Number(s.weight) || 0));

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       {/* Header */}
       <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 text-yellow-600 mb-2 shadow-sm ring-4 ring-yellow-50">
             <Trophy className="w-10 h-10 fill-current" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">운동 완료!</h1>
          <p className="text-muted-foreground">오늘도 목표를 달성하셨네요. 수고하셨습니다!</p>
       </div>

       {/* AI Feedback Card */}
       <Card className="w-full max-w-md border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
             <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5 fill-current" />
                AI 성과 분석
             </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="font-medium text-lg leading-relaxed">
               "{feedback?.feedback_text}"
             </p>
             <div className="mt-4 flex justify-end">
                <span className="text-xs font-semibold bg-white/50 px-2 py-1 rounded border border-primary/10 text-primary">
                   운동 점수: {feedback?.score}점
                </span>
             </div>
          </CardContent>
       </Card>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <Card>
             <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
                <Clock className="w-6 h-6 text-muted-foreground" />
                <span className="text-2xl font-bold">{durationMinutes}분</span>
                <span className="text-xs text-muted-foreground">총 운동 시간</span>
             </CardContent>
          </Card>
          <Card>
             <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
                <Dumbbell className="w-6 h-6 text-muted-foreground" />
                <span className="text-2xl font-bold">{totalVolume.toLocaleString()}kg</span>
                <span className="text-xs text-muted-foreground">총 볼륨</span>
             </CardContent>
          </Card>
          <Card>
             <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                <span className="text-2xl font-bold">{totalSets}세트</span>
                <span className="text-xs text-muted-foreground">완료한 세트</span>
             </CardContent>
          </Card>
           <Card>
             <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
                <Trophy className="w-6 h-6 text-muted-foreground" />
                <span className="text-2xl font-bold">{maxWeight}kg</span>
                <span className="text-xs text-muted-foreground">최고 중량</span>
             </CardContent>
          </Card>
       </div>

       {/* Actions */}
       <div className="w-full max-w-md pt-4">
          <Link href="/dashboard">
             <Button className="w-full h-14 text-lg rounded-2xl shadow-lg">
                <Home className="mr-2 w-5 h-5" />
                홈으로 돌아가기
             </Button>
          </Link>
       </div>
    </div>
  );
}
