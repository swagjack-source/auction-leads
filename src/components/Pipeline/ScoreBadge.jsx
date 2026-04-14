import { getScoreColor, getScoreLabel } from '../../lib/scoring'

export default function ScoreBadge({ score, size = 'sm' }) {
  if (score == null) return null
  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  const isLarge = size === 'lg'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLarge ? 8 : 5,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: isLarge ? 10 : 6,
      padding: isLarge ? '6px 12px' : '3px 8px',
    }}>
      <div style={{
        width: isLarge ? 10 : 7,
        height: isLarge ? 10 : 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: isLarge ? 15 : 12,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {score.toFixed(1)}
      </span>
      {isLarge && (
        <span style={{ fontSize: 13, color, opacity: 0.8 }}>{label}</span>
      )}
    </div>
  )
}
