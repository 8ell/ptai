'use client'

import { createClient } from '@/lib/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const router = useRouter()

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase, router])

  if (!supabase) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          로그인
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={['github']} // Example provider, can be 'google', 'kakao' etc.
          localization={{
            variables: {
              sign_in: {
                email_label: '이메일 주소',
                password_label: '비밀번호',
                email_input_placeholder: '이메일 주소를 입력하세요',
                password_input_placeholder: '비밀번호를 입력하세요',
                button_label: '로그인',
                social_provider_text: '{{provider}}로 로그인',
                link_text: '이미 계정이 있으신가요? 로그인',
              },
              sign_up: {
                email_label: '이메일 주소',
                password_label: '비밀번호',
                email_input_placeholder: '이메일 주소를 입력하세요',
                password_input_placeholder: '비밀번호를 입력하세요',
                button_label: '가입하기',
                social_provider_text: '{{provider}}로 가입',
                link_text: '계정이 없으신가요? 가입하기',
              },
              forgotten_password: {
                email_label: '이메일 주소',
                email_input_placeholder: '이메일 주소를 입력하세요',
                button_label: '비밀번호 재설정 링크 보내기',
                link_text: '비밀번호를 잊으셨나요?',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
