export function calculateScore({ value, feasibility, data, speed, risk }) {
  return (value * 2) + feasibility + data + speed - risk
}

export function getRecommendation(totalScore) {
  if (totalScore >= 18) return 'QUICK_WIN'
  if (totalScore >= 12) return 'STRATEGIC'
  return 'AVOID'
}

export function applyScoring(scores) {
  const total = calculateScore(scores)
  return {
    totalScore: total,
    recommendation: getRecommendation(total),
  }
}
