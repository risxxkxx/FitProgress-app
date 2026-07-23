// Иста формула како во почетниот калкулатор (OnboardingPage), но извлечена тука
// за да може да се повторно искористи кога корисникот ќе ја смени целната тежина
// во Поставки, без да мора да го поминува целиот onboarding повторно.

const GOAL_DELTA = { fat_loss: -400, recomp: 0, muscle_gain: 300 }
const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Ја погодува целта (губење/градење/одржување) споредувајќи ја тековната со целната тежина
export function inferGoalFromWeights(currentWeight, targetWeight) {
  const diff = Number(targetWeight) - Number(currentWeight)
  if (diff <= -1) return 'fat_loss'
  if (diff >= 1) return 'muscle_gain'
  return 'recomp'
}

// weight: тежина користена за BMR (тековна тежина е поточна од целната за метаболизам)
export function calcDailyTargets({ weight, height, age, isMale, activity = 'moderate', goal = 'recomp' }) {
  weight = Number(weight); height = Number(height); age = Number(age)
  if (!weight || !height || !age) return null
  if (age < 13 || age > 90 || height < 100 || height > 230 || weight < 30 || weight > 250) return null

  const bmr = isMale ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161
  const factor = ACTIVITY_FACTOR[activity] || ACTIVITY_FACTOR.moderate
  const tdee = Math.round(bmr * factor)
  const kcalGoal = clamp(Math.round(tdee + (GOAL_DELTA[goal] ?? 0)), 1200, 5000)
  const protGoal = clamp(Math.round(weight * (goal === 'muscle_gain' ? 2.2 : 1.8)), 20, 350)
  const waterGoal = clamp(Math.round((weight * 35) / 250), 4, 20)

  return { bmr: Math.round(bmr), tdee, kcalGoal, protGoal, waterGoal, goal }
}
