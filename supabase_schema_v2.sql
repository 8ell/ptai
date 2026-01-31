-- 1. 사용자 목표 및 신체 정보
create table if not exists user_goals (
  user_id uuid references auth.users not null primary key,
  height numeric, -- cm
  current_weight numeric, -- kg (시작 시점)
  target_weight numeric, -- kg
  current_muscle_mass numeric, -- kg (선택)
  target_muscle_mass numeric, -- kg (선택)
  start_date date default current_date,
  target_date date, -- 목표 달성 예정일
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. AI 운동 플랜
create table if not exists workout_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plan_data jsonb, -- AI가 생성한 분할/루틴 정보 (JSON)
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. 일일 운동 피드백 (AI 코멘트)
create table if not exists workout_feedbacks (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts on delete cascade not null,
  user_id uuid references auth.users not null,
  feedback_text text,
  score int, -- 1~100 점수 등
  created_at timestamptz default now()
);

-- RLS 정책
alter table user_goals enable row level security;
alter table workout_plans enable row level security;
alter table workout_feedbacks enable row level security;

-- user_goals policies
create policy "Users can select their own goals" on user_goals 
  for select using (auth.uid() = user_id);

create policy "Users can insert their own goals" on user_goals 
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own goals" on user_goals 
  for update using (auth.uid() = user_id);

-- workout_plans policies
create policy "Users can select their own plans" on workout_plans 
  for select using (auth.uid() = user_id);

create policy "Users can insert their own plans" on workout_plans 
  for insert with check (auth.uid() = user_id);

-- workout_feedbacks policies
create policy "Users can select their own feedbacks" on workout_feedbacks 
  for select using (auth.uid() = user_id);

create policy "Users can insert their own feedbacks" on workout_feedbacks 
  for insert with check (auth.uid() = user_id);
