'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus, Save, Timer, CheckCircle2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { WorkoutSession, WorkoutSet, workoutSetSchema } from '../schema';
import { addWorkoutSetAction, finishWorkoutAction } from '../actions';

interface ActiveWorkoutViewProps {
  workout: WorkoutSession;
  initialSets: WorkoutSet[];
}

export function ActiveWorkoutView({ workout, initialSets }: ActiveWorkoutViewProps) {
  const router = useRouter();
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets);
  const [elapsed, setElapsed] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // 휴식 타이머 상태
  const [isResting, setIsResting] = useState(false);
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(0);

  // 서버 데이터와 로컬 상태 동기화
  useEffect(() => {
    setSets(initialSets);
  }, [initialSets]);

  // 전체 운동 타이머
  useEffect(() => {
    const startTime = new Date(workout.started_at).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setElapsed(Math.floor((now - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.started_at]);

  // 휴식 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setRestDuration(Math.floor((now - restStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restStartTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 폼 설정
  const form = useForm<z.infer<typeof workoutSetSchema>>({
    resolver: zodResolver(workoutSetSchema),
    defaultValues: {
      exercise_name: '',
      weight: 0,
      reps: 0,
      rpe: 8,
      set_number: 1,
    },
  });

  // 세트 데이터가 변경되거나 입력될 때 "스마트 프리필" 로직
  const exerciseName = form.watch('exercise_name');

  useEffect(() => {
    if (!exerciseName) return;

    // 현재 세션에서 해당 운동의 마지막 기록 찾기
    const sameExerciseSets = sets.filter((s) => s.exercise_name === exerciseName);
    if (sameExerciseSets.length > 0) {
      const lastSet = sameExerciseSets[sameExerciseSets.length - 1];
      
      // 다음 세트 번호 자동 설정 (이미 입력된 값이 없을 때만)
      // 여기서는 심플하게 항상 계산
      form.setValue('set_number', lastSet.set_number + 1);
    } else {
      form.setValue('set_number', 1);
    }
  }, [exerciseName, sets, form]); 

  // 세트 추가 핸들러
  const onSubmit = (values: z.infer<typeof workoutSetSchema>) => {
    startTransition(async () => {
      const result = await addWorkoutSetAction(workout.id, values);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('세트가 기록되었습니다.');
        
        // 1. 현재 값 캡처 (다음 세트 프리필용)
        const currentWeight = values.weight;
        const currentReps = values.reps;
        const currentName = values.exercise_name;
        const nextSetNum = values.set_number + 1;

        // 2. 폼 재설정 
        form.reset({
          exercise_name: currentName,
          weight: currentWeight,
          reps: currentReps,
          rpe: values.rpe,
          set_number: nextSetNum,
        });

        // 3. 목록 새로고침
        router.refresh(); 

        // 4. 휴식 모드 진입
        setRestStartTime(Date.now());
        setRestDuration(0);
        setIsResting(true);
      }
    });
  };

  const skipRest = () => {
    setIsResting(false);
    setRestStartTime(null);
  };

  const handleFinish = async () => {
    if (!confirm('운동을 종료하시겠습니까?')) return;
    
    startTransition(async () => {
      await finishWorkoutAction(workout.id);
    });
  };

  // UI 렌더링을 위해 세트 역순 정렬
  const groupedSets = sets.reduce((acc, set) => {
    if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
    acc[set.exercise_name].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>);

  // 휴식 타이머 오버레이
  if (isResting) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-8 w-full max-w-md">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-muted-foreground">휴식 중</h2>
            <div className="text-8xl font-black font-mono tracking-tighter text-primary">
              {formatTime(restDuration)}
            </div>
            <p className="text-sm text-muted-foreground">다음 세트를 위해 에너지를 충전하세요.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-8">
             {/* 추후 구현: 휴식 시간 +/- 버튼 */}
             {/* <Button variant="outline" size="lg" onClick={() => setRestStartTime(curr => curr ? curr + 30000 : null)}>-30초</Button> */}
             {/* <Button variant="outline" size="lg" onClick={() => setRestStartTime(curr => curr ? curr - 30000 : null)}>+30초</Button> */}
          </div>

          <Button 
            size="lg" 
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg" 
            onClick={skipRest}
          >
            다음 세트 시작하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-6">
      {/* 헤더: 타이머 및 종료 버튼 */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-2 border-b">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => router.push('/workout')}>
              <ChevronLeft className="h-5 w-5" />
           </Button>
           <div className="flex flex-col">
             <span className="text-xs text-muted-foreground">경과 시간</span>
             <span className="text-xl font-mono font-bold text-primary flex items-center gap-1">
               <Timer className="w-4 h-4" />
               {formatTime(elapsed)}
             </span>
           </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleFinish} disabled={isPending}>
          운동 종료
        </Button>
      </div>

      {/* 입력 폼 */}
      <Card className="border-primary/50 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-lg">세트 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                   <FormField
                    control={form.control}
                    name="exercise_name"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">운동 종목</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 스쿼트" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                 <div className="col-span-1">
                   <FormField
                    control={form.control}
                    name="set_number"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">세트</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="text-center bg-muted" readOnly tabIndex={-1} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">무게(kg)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reps"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">횟수</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="rpe"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">RPE</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                기록 저장
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 기록 리스트 (종목별 그룹핑) */}
      <div className="space-y-4">
        <h3 className="font-semibold px-1">오늘의 기록</h3>
        {Object.entries(groupedSets).reverse().map(([name, exerciseSets]) => (
          <Card key={name} className="overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 font-medium border-b flex justify-between items-center">
              <span>{name}</span>
              <Badge variant="secondary" className="text-xs">{exerciseSets.length} 세트</Badge>
            </div>
            <div className="divide-y">
              {exerciseSets.map((set) => (
                <div key={set.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-12 justify-center">{set.set_number}세트</Badge>
                    <span className="font-mono font-medium">{set.weight}kg <span className="text-muted-foreground mx-1">x</span> {set.reps}회</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    RPE {set.rpe}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {sets.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            아직 기록된 세트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
