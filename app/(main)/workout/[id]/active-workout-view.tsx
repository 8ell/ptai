'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Square, Save, Timer, ChevronLeft, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { addWorkoutSetAction, finishWorkoutAction, updateSetRestTimeAction } from '../actions';
import { cn } from '@/lib/utils';

interface ActiveWorkoutViewProps {
  workout: WorkoutSession;
  initialSets: WorkoutSet[];
}

// 단계: 대기 -> 운동중 -> 기록 -> 휴식
type WorkoutPhase = 'ready' | 'executing' | 'logging' | 'resting';

export function ActiveWorkoutView({ workout, initialSets }: ActiveWorkoutViewProps) {
  const router = useRouter();
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets);
  const [phase, setPhase] = useState<WorkoutPhase>('ready');
  const [isPending, startTransition] = useTransition();

  // Timers
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const [setDuration, setSetDuration] = useState(0);
  const [restDuration, setRestDuration] = useState(0);
  
  // Timer Refs (to clear intervals accurately)
  const setTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restStartTimeRef = useRef<number | null>(null);

  // ID of the set currently being rested after
  const [lastSetId, setLastSetId] = useState<string | null>(null);

  // Sync with server data
  useEffect(() => {
    setSets(initialSets);
  }, [initialSets]);

  // 1. Total Workout Timer
  useEffect(() => {
    const startTime = new Date(workout.started_at).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setWorkoutElapsed(Math.floor((now - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.started_at]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Form Setup
  const form = useForm<z.infer<typeof workoutSetSchema>>({
    resolver: zodResolver(workoutSetSchema),
    defaultValues: {
      exercise_name: '',
      weight: 0,
      reps: 0,
      rpe: 8,
      set_number: 1,
      duration: 0,
      rest_time: 0,
    },
  });

  // --- Actions ---

  // A. Start Set (Ready -> Executing)
  const handleStartSet = () => {
    setPhase('executing');
    setSetDuration(0);
    
    setTimerRef.current = setInterval(() => {
      setSetDuration(prev => prev + 1);
    }, 1000);
  };

  // B. Finish Set (Executing -> Logging)
  const handleFinishSet = () => {
    if (setTimerRef.current) clearInterval(setTimerRef.current);
    setPhase('logging');
    form.setValue('duration', setSetDuration ? setDuration : 0);
  };

  // Smart Prefill Logic (Triggered when entering Logging phase or changing exercise)
  const exerciseName = form.watch('exercise_name');
  useEffect(() => {
    if (!exerciseName) return;
    
    // Find last set of this exercise
    const sameExerciseSets = sets.filter((s) => s.exercise_name === exerciseName);
    if (sameExerciseSets.length > 0) {
      const lastSet = sameExerciseSets[sameExerciseSets.length - 1];
      
      // If we are just starting to log (and user hasn't manually changed set number yet), auto-increment
      // Simple logic: Always suggest next set number
      const currentSetNum = form.getValues('set_number');
      if (currentSetNum === 1 || currentSetNum === lastSet.set_number) {
         form.setValue('set_number', lastSet.set_number + 1);
      }
    } else {
       // First set of this exercise
       form.setValue('set_number', 1);
    }
  }, [exerciseName, sets, form, phase]);


  // C. Submit Log (Logging -> Resting)
  const onSubmit = (values: z.infer<typeof workoutSetSchema>) => {
    startTransition(async () => {
      const result = await addWorkoutSetAction(workout.id, values);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('세트 저장됨');
        
        // Prepare for next set (Prefill)
        const currentWeight = values.weight;
        const currentReps = values.reps;
        const currentName = values.exercise_name;
        
        form.reset({
          exercise_name: currentName,
          weight: currentWeight, // Keep weight
          reps: currentReps,     // Keep reps
          rpe: values.rpe,
          set_number: values.set_number + 1, // Increment set
          duration: 0,
          rest_time: 0,
        });

        // Set Last Set ID for rest time update
        if (result.setId) {
            setLastSetId(result.setId);
        }

        router.refresh(); 

        // Start Resting
        setPhase('resting');
        setRestDuration(0);
        restStartTimeRef.current = Date.now();
        restTimerRef.current = setInterval(() => {
           if (restStartTimeRef.current) {
               setRestDuration(Math.floor((Date.now() - restStartTimeRef.current) / 1000));
           }
        }, 1000);
      }
    });
  };

  // D. Finish Rest (Resting -> Ready)
  const handleFinishRest = async () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    
    // Update rest time for the previous set
    if (lastSetId) {
       await updateSetRestTimeAction(lastSetId, restDuration);
    }
    
    setPhase('ready');
    setRestDuration(0);
    setLastSetId(null);
  };

  const handleFinishWorkout = async () => {
    if (!confirm('운동을 종료하시겠습니까?')) return;
    startTransition(async () => {
      await finishWorkoutAction(workout.id);
    });
  };

  // Group sets for display
  const groupedSets = sets.reduce((acc, set) => {
    if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
    acc[set.exercise_name].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>);

  // --- RENDER ---

  // 1. Full Screen Overlay for EXECUTING
  if (phase === 'executing') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 space-y-10 animate-in fade-in duration-200">
         <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-primary">{form.getValues('exercise_name') || '운동 중'}</h2>
            <div className="text-9xl font-black font-mono tracking-tighter text-foreground">
              {formatTime(setDuration)}
            </div>
            <p className="text-muted-foreground text-lg">세트 수행 중...</p>
         </div>
         <Button size="lg" className="w-full max-w-xs h-20 text-2xl rounded-2xl" onClick={handleFinishSet}>
            <Square className="mr-3 h-6 w-6 fill-current" />
            세트 완료
         </Button>
      </div>
    );
  }

  // 2. Full Screen Overlay for RESTING
  if (phase === 'resting') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-10 animate-in fade-in duration-200">
         <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-300">휴식 중</h2>
            <div className="text-9xl font-black font-mono tracking-tighter text-green-400">
              {formatTime(restDuration)}
            </div>
            <p className="text-slate-400">다음 세트를 준비하세요</p>
         </div>
         <Button 
            variant="secondary"
            size="lg" 
            className="w-full max-w-xs h-20 text-2xl rounded-2xl" 
            onClick={handleFinishRest}
         >
            <SkipForward className="mr-3 h-6 w-6" />
            다음 세트 시작
         </Button>
      </div>
    );
  }

  // 3. Main View (Ready & Logging)
  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => router.push('/workout')}>
              <ChevronLeft className="h-5 w-5" />
           </Button>
           <div className="flex flex-col">
             <span className="text-xs text-muted-foreground">총 운동 시간</span>
             <span className="text-xl font-mono font-bold text-primary flex items-center gap-1">
               <Timer className="w-4 h-4" />
               {formatTime(workoutElapsed)}
             </span>
           </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleFinishWorkout} disabled={isPending}>
          운동 종료
        </Button>
      </div>

      {/* Controller Card */}
      <Card className={cn("border-2 shadow-sm transition-colors", phase === 'logging' ? 'border-primary' : 'border-border')}>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-lg flex justify-between items-center">
             <span>{phase === 'logging' ? '기록 입력' : '세트 준비'}</span>
             {phase === 'logging' && <Badge variant="default">입력 대기중</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {phase === 'ready' ? (
             <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                   <p className="text-sm text-muted-foreground mb-2">
                     {form.getValues('exercise_name') ? `${form.getValues('exercise_name')} ${form.getValues('set_number')}세트` : '새로운 세트'}
                   </p>
                   <p className="font-medium">준비되면 시작 버튼을 누르세요</p>
                </div>
                {/* 폼을 미리 보여줘서 운동 종목을 수정할 수 있게 함 */}
                <div className="grid grid-cols-1 gap-2">
                    <Form {...form}>
                         <FormField
                            control={form.control}
                            name="exercise_name"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <Input placeholder="운동 종목 입력 (예: 스쿼트)" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </Form>
                </div>
                <Button size="lg" className="w-full h-14 text-lg" onClick={handleStartSet}>
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  세트 시작
                </Button>
             </div>
          ) : (
            // Logging Phase
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
                 
                {/* 수행 시간 (자동 입력되지만 수정 가능) */}
                 <div className="grid grid-cols-2 gap-2">
                     <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                            <FormLabel className="text-xs">수행 시간(초)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            </FormItem>
                        )}
                     />
                 </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    기록 저장 & 휴식 시작
                </Button>
                </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Log List */}
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
                  <div className="text-muted-foreground text-xs flex gap-2">
                    {set.duration && <span>⏱️ {set.duration}s</span>}
                    {set.rest_time && set.rest_time > 0 && <span>☕ {set.rest_time}s</span>}
                    <span>RPE {set.rpe}</span>
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