import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { checkUserGoalAction } from '../onboarding/actions'

// Assuming shadcn/ui components are available
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 목표 설정 여부 확인
  const hasGoal = await checkUserGoalAction();
  if (!hasGoal) {
    redirect('/onboarding');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-gray-500">
          환영합니다, {user.email}! 운동과 식단을 기록하고 목표를 향해 나아가세요.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>오늘의 운동</CardTitle>
            <CardDescription>아직 기록된 운동이 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>오늘 한 운동을 기록해보세요.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>오늘의 식단</CardTitle>
            <CardDescription>아직 기록된 식단이 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>오늘 먹은 식단을 기록하고 칼로리를 확인하세요.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>목표 진행률</CardTitle>
            <CardDescription>목표가 아직 설정되지 않았습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>목표를 설정하고 진행 상황을 추적해보세요.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
