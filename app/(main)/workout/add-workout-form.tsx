"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addWorkoutLogAction, workoutLogSchema } from "./actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function AddWorkoutLogDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof workoutLogSchema>>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: {
      exercise_name: "",
      weight: 0,
      reps: 0,
      sets: 0,
      rpe: 7,
      workout_date: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof workoutLogSchema>) {
    startTransition(async () => {
      const result = await addWorkoutLogAction(values);
      if (result.error) {
        toast.error(`오류: ${result.error}`);
      } else {
        toast.success("운동 기록이 추가되었습니다!");
        form.reset();
        setIsOpen(false);
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>새 운동 기록 추가</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 운동 기록</DialogTitle>
          <DialogDescription>
            오늘의 운동을 기록하고 성장을 추적하세요.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="exercise_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>운동 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="벤치 프레스" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>무게 (kg)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="reps"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>횟수</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="sets"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>세트</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="rpe"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>운동 강도 (RPE)</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" max="10" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="workout_date"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>운동 날짜</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>날짜를 선택하세요</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button variant="ghost">취소</Button>
                </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "저장 중..." : "기록 저장"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
