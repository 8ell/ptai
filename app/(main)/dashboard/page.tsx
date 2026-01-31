import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkUserGoalAction } from '../onboarding/actions';
import { getDashboardData } from './actions';
import { DashboardView } from './dashboard-view';

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

  return (
    <DashboardView 
      user={user} 
      goal={goal} 
      plan={plan} 
      history={history} 
    />
  );
}
