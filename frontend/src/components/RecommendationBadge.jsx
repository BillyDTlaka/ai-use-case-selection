const styles = {
  QUICK_WIN: 'bg-green-100 text-green-800 border border-green-300',
  STRATEGIC: 'bg-blue-100 text-blue-800 border border-blue-300',
  AVOID: 'bg-red-100 text-red-800 border border-red-300',
}

const labels = {
  QUICK_WIN: 'Quick Win',
  STRATEGIC: 'Strategic',
  AVOID: 'Avoid',
}

export function RecommendationBadge({ value }) {
  if (!value) return <span className="text-gray-300 text-sm">—</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${styles[value] ?? ''}`}>
      {labels[value] ?? value}
    </span>
  )
}
