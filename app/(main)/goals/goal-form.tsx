'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTransition } from 'react';
import 'react-day-picker/dist/style.css';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { updateGoalAction } from './actions';
import { goalFormSchema } from './schema';

export type Profile = {
	username: string | null;
	target_weight: number | null;
	goal_period_start: string | null;
	goal_period_end: string | null;
};

// Client Component: The form itself
export function GoalForm({ profile }: { profile: Profile }) {
	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof goalFormSchema>>({
		resolver: zodResolver(goalFormSchema) as any,
		defaultValues: {
			username: profile.username ?? '',
			target_weight: profile.target_weight ?? 0,
			goal_period_start: profile.goal_period_start
				? new Date(profile.goal_period_start)
				: undefined,
			goal_period_end: profile.goal_period_end
				? new Date(profile.goal_period_end)
				: undefined,
		},
	});

	function onSubmit(values: z.infer<typeof goalFormSchema>) {
		startTransition(async () => {
			const result = await updateGoalAction(values);
			if (result.error) {
				toast.error(`저장 중 오류가 발생했습니다: ${result.error}`);
			} else {
				toast.success('목표가 성공적으로 저장되었습니다!');
			}
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
				<FormField
					control={form.control}
					name='username'
					render={({ field }) => (
						<FormItem>
							<FormLabel>사용자 이름</FormLabel>
							<FormControl>
								<Input placeholder='헬창' {...field} />
							</FormControl>
							<FormDescription>
								다른 사람에게 보여질 이름입니다.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='target_weight'
					render={({ field }) => (
						<FormItem>
							<FormLabel>목표 체중 (kg)</FormLabel>
							<FormControl>
								<Input type='number' placeholder='70' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
					<FormField
						control={form.control}
						name='goal_period_start'
						render={({ field }) => (
							<FormItem className='flex flex-col'>
								<FormLabel>목표 시작일</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant={'outline'}
												className={cn(
													'w-full pl-3 text-left font-normal',
													!field.value &&
														'text-muted-foreground',
												)}>
												{field.value ? (
													format(
														field.value,
														'PPP',
													)
												) : (
													<span>
														날짜를
														선택하세요
													</span>
												)}
												<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										className='w-auto p-0'
										align='start'>
										<Calendar
											mode='single'
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
					<FormField
						control={form.control}
						name='goal_period_end'
						render={({ field }) => (
							<FormItem className='flex flex-col'>
								<FormLabel>목표 종료일</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant={'outline'}
												className={cn(
													'w-full pl-3 text-left font-normal',
													!field.value &&
														'text-muted-foreground',
												)}>
												{field.value ? (
													format(
														field.value,
														'PPP',
													)
												) : (
													<span>
														날짜를
														선택하세요
													</span>
												)}
												<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										className='w-auto p-0'
										align='start'>
										<Calendar
											mode='single'
											selected={field.value}
											onSelect={field.onChange}
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<Button type='submit' disabled={isPending}>
					{isPending ? '저장 중...' : '저장하기'}
				</Button>
			</form>
		</Form>
	);
}
