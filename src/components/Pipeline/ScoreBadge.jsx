import { memo } from 'react'
import { getScoreColor, getScoreLabel } from '../../lib/scoring'

const ScoreBadge = memo(function ScoreBadge({ score, size = 'sm' }) {
  if (score == null) return null
  const color = getScoreColor(score)
  const label = getScoreLabel(score)
  const isLarge = size === 'lg'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLarge ? 7 : 5,
      background: `${color}15`,
      border: `1px solid ${color}35`,
      borderRadius: isLarge ? 10 : 6,
      padding: isLarge ? '6px 12px' : '3px 8px',
    }}>
      <div style={{
        width: isLarge ? 9 : 6,
        height: isLarge ? 9 : 6,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span className="tnum" style={{
        fontSize: isLarge ? 14 : 11.5,
        fontWeight: 700,
        color,
      }}>
        {score.toFixed(1)}
      </span>
      {isLarge && (
        <span style={{ fontSize: 12, color, opacity: 0.8 }}>{label}</span>
      )}
    </div>
  )
})

export default ScoreBadge
