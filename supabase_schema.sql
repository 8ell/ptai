-- 기존 테이블이 있다면 백업하거나 삭제 후 진행하세요
-- drop table if exists workout_logs; 

-- 1. 운동 세션 테이블 (하루의 운동 전체를 묶음)
create table if not exists workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text, -- 예: "2024-01-31 운동"
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'in_progress', -- 'in_progress', 'completed'
  created_at timestamptz default now()
);

-- 2. 운동 세트 테이블 (각 세트별 기록)
create table if not exists workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts on delete cascade not null,
  user_id uuid references auth.users not null, -- 쿼리 편의성을 위해 추가
  exercise_name text not null,
  set_number int not null, -- 1세트, 2세트...
  weight numeric default 0,
  reps numeric default 0,
  rpe numeric, -- 운동 강도 (선택)
  created_at timestamptz default now()
);

-- RLS (Row Level Security) 정책 설정 (보안)
alter table workouts enable row level security;
alter table workout_sets enable row level security;

create policy "Users can view their own workouts" 
on workouts for select using (auth.uid() = user_id);

create policy "Users can insert their own workouts" 
on workouts for insert with check (auth.uid() = user_id);

create policy "Users can update their own workouts" 
on workouts for update using (auth.uid() = user_id);

create policy "Users can view their own sets" 
on workout_sets for select using (auth.uid() = user_id);

create policy "Users can insert their own sets" 
on workout_sets for insert with check (auth.uid() = user_id);

create policy "Users can update their own sets" 
on workout_sets for update using (auth.uid() = user_id);
