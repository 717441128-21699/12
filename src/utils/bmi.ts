import type { MemberBodyData, TrainingGoal } from '../types';

export function calculateBMI(height: number, weight: number): number {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

export function calculateBMR(
  height: number,
  weight: number,
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    return Math.round(88.362 + 13.397 * weight + 4.799 * height - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weight + 3.098 * height - 4.33 * age);
}

export function calculateBodyData(
  height: number,
  weight: number,
  bodyFat: number,
  age: number,
  gender: 'male' | 'female',
  goal: TrainingGoal,
  memberId: string
): MemberBodyData {
  return {
    memberId,
    height,
    weight,
    bodyFat,
    age,
    gender,
    goal,
    bmi: calculateBMI(height, weight),
    bmr: calculateBMR(height, weight, age, gender),
  };
}

export function calculateTDEE(bmr: number, activityFactor: number = 1.55): number {
  return Math.round(bmr * activityFactor);
}

export function getGoalName(goal: TrainingGoal): string {
  const map: Record<TrainingGoal, string> = {
    lose_fat: '减脂',
    muscle_gain: '增肌',
    shaping: '塑形',
    rehabilitation: '康复',
  };
  return map[goal];
}
