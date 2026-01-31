'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollPicker } from '@/components/ui/scroll-picker';
import { submitOnboardingAction } from './actions';
import { toast } from 'sonner';

// 데이터 생성 헬퍼
const generateRange = (start: number, end: number, step: number = 1) => {
  const arr = [];
  for (let i = start; i <= end; i += step) {
    arr.push(Number(i.toFixed(1))); // 소수점 처리
  }
  return arr;
};

const HEIGHTS = generateRange(140, 220, 1);
const WEIGHTS = generateRange(30, 150, 0.5);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    height: 170,
    current_weight: 70,
    target_weight: 65,
    current_muscle_mass: 0, // 0 means 'unknown' or skipped
    target_muscle_mass: 0,
  });

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = () => {
    setStep(7); // Loading/Analyzing step
    
    startTransition(async () => {
      // 2초 딜레이로 AI가 분석하는 척 연출
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await submitOnboardingAction({
          ...formData,
          current_muscle_mass: formData.current_muscle_mass === 0 ? null : formData.current_muscle_mass,
          target_muscle_mass: formData.target_muscle_mass === 0 ? null : formData.target_muscle_mass,
      });

      if (result.error) {
        toast.error(result.error);
        setStep(6); // Back to review step
      } else {
        toast.success('맞춤형 플랜이 생성되었습니다!');
        router.push('/dashboard');
      }
    });
  };

  const updateField = (field: string, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Progress Bar */}
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <motion.div 
            className="bg-primary h-full"
            initial={{ width: 0 }}
            animate={{ width: `${((step - 1) / 5) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait" custom={step}>
          
          {/* Step 1: Height */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">키가 어떻게 되시나요?</h1>
                <p className="text-muted-foreground">정확한 BMI 계산과 운동 강도 설정을 위해 필요해요.</p>
              </div>
              
              <div className="py-8">
                <ScrollPicker
                  items={HEIGHTS}
                  value={formData.height}
                  onValueChange={(val) => updateField('height', Number(val))}
                  label="cm"
                />
              </div>

              <Button onClick={handleNext} className="w-full h-14 text-lg rounded-full">
                다음
              </Button>
            </motion.div>
          )}

          {/* Step 2: Current Weight */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">현재 체중은요?</h1>
                <p className="text-muted-foreground">변화의 시작점을 기록해둘게요.</p>
              </div>
              
              <div className="py-8">
                <ScrollPicker
                  items={WEIGHTS}
                  value={formData.current_weight}
                  onValueChange={(val) => updateField('current_weight', Number(val))}
                  label="kg"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-full">이전</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 text-lg rounded-full">다음</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Target Weight */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">목표 체중을 설정해주세요</h1>
                <p className="text-muted-foreground">AI가 달성 가능한 기간을 분석해드릴게요.</p>
              </div>
              
              <div className="py-8">
                <ScrollPicker
                  items={WEIGHTS}
                  value={formData.target_weight}
                  onValueChange={(val) => updateField('target_weight', Number(val))}
                  label="kg"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-full">이전</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 text-lg rounded-full">다음</Button>
              </div>
            </motion.div>
          )}

           {/* Step 4: Current Muscle Mass (Optional) */}
           {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">현재 골격근량은요?</h1>
                <p className="text-muted-foreground">인바디 수치가 있다면 입력해주세요. (선택사항)</p>
              </div>
              
              <div className="py-8 relative">
                {formData.current_muscle_mass === 0 ? (
                    <div className="h-64 flex items-center justify-center bg-muted/20 rounded-xl">
                        <span className="text-muted-foreground">모름 / 입력 안 함</span>
                    </div>
                ) : (
                    <ScrollPicker
                    items={generateRange(15, 60, 0.5)}
                    value={formData.current_muscle_mass}
                    onValueChange={(val) => updateField('current_muscle_mass', Number(val))}
                    label="kg"
                    />
                )}
              </div>
              
              {/* 토글 버튼 */}
               <div className="flex justify-center gap-2 mb-4">
                  <Button 
                    variant={formData.current_muscle_mass === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('current_muscle_mass', 0)}
                  >
                    잘 모르겠어요
                  </Button>
                  <Button 
                    variant={formData.current_muscle_mass !== 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('current_muscle_mass', 25)} // Default value to start picking
                  >
                    직접 입력
                  </Button>
               </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-full">이전</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 text-lg rounded-full">다음</Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Target Muscle Mass (Optional) */}
           {step === 5 && (
            <motion.div
              key="step5"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">목표 골격근량은요?</h1>
                <p className="text-muted-foreground">목표가 있다면 입력해주세요. (선택사항)</p>
              </div>
              
              <div className="py-8 relative">
                {formData.target_muscle_mass === 0 ? (
                    <div className="h-64 flex items-center justify-center bg-muted/20 rounded-xl">
                        <span className="text-muted-foreground">목표 없음 / 유지</span>
                    </div>
                ) : (
                    <ScrollPicker
                    items={generateRange(15, 60, 0.5)}
                    value={formData.target_muscle_mass}
                    onValueChange={(val) => updateField('target_muscle_mass', Number(val))}
                    label="kg"
                    />
                )}
              </div>
              
              {/* 토글 버튼 */}
               <div className="flex justify-center gap-2 mb-4">
                  <Button 
                    variant={formData.target_muscle_mass === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('target_muscle_mass', 0)}
                  >
                    목표 없음
                  </Button>
                  <Button 
                    variant={formData.target_muscle_mass !== 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('target_muscle_mass', 25)} // Default value to start picking
                  >
                    직접 입력
                  </Button>
               </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-full">이전</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 text-lg rounded-full">다음</Button>
              </div>
            </motion.div>
          )}

           {/* Step 6: Final Review & Submit */}
           {step === 6 && (
            <motion.div
              key="step6"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold mb-2">준비 완료!</h1>
                <p className="text-muted-foreground">입력하신 정보를 확인해주세요.</p>
              </div>
              
              <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm text-left">
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">키</span>
                      <span className="font-bold text-lg">{formData.height} cm</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">현재 체중</span>
                      <span className="font-bold text-lg">{formData.current_weight} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">목표 체중</span>
                      <span className="font-bold text-lg text-primary">{formData.target_weight} kg</span>
                  </div>
                   <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">현재 골격근량</span>
                      <span className="font-bold text-lg">
                          {formData.current_muscle_mass ? `${formData.current_muscle_mass} kg` : '-'}
                      </span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">목표 골격근량</span>
                      <span className="font-bold text-lg">
                          {formData.target_muscle_mass ? `${formData.target_muscle_mass} kg` : '-'}
                      </span>
                  </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-full">수정</Button>
                <Button onClick={handleSubmit} className="flex-[2] h-14 text-lg rounded-full shadow-lg shadow-primary/30">
                  AI 플랜 생성하기
                </Button>
              </div>
            </motion.div>
          )}

           {/* Step 7: Analyzing (Loading) */}
           {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center flex flex-col items-center justify-center py-10"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                 <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">AI가 운동 플랜을 설계 중입니다</h2>
                <p className="text-muted-foreground animate-pulse">체형 분석 중...<br/>최적의 분할법 계산 중...</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
