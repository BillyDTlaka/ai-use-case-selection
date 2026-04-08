export function ScoreCell({ value }) {
  if (value == null) return <span className="text-gray-300">—</span>
  const color =
    value >= 4 ? 'text-green-700 bg-green-50'
    : value === 3 ? 'text-amber-700 bg-amber-50'
    : 'text-red-700 bg-red-50'
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-semibold text-sm ${color}`}>
      {value}
    </span>
  )
}
