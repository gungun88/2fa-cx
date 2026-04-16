interface Props {
  secs: number
}

const RADIUS = 23
const CIRC = 2 * Math.PI * RADIUS

export function CountdownRing({ secs }: Props) {
  const fraction = secs / 30
  const offset = CIRC * (1 - fraction)
  const color = secs > 20 ? '#378ADD' : secs > 10 ? '#EF9F27' : '#E24B4A'

  const nextTime = new Date(Date.now() + secs * 1000)
  const label = nextTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        aria-label={`\u8ddd\u79bb\u4e0b\u6b21\u5237\u65b0\u8fd8\u6709 ${secs} \u79d2`}
      >
        <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="#d6d3cb" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s' }}
        />
        <text
          x="28"
          y="33"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="JetBrains Mono, monospace"
          className="text-slate-800"
        >
          {secs}
        </text>
      </svg>
      <span className="text-xs font-semibold text-slate-600">
        {`\u4e0b\u6b21\u5237\u65b0\uff1a${label}`}
      </span>
    </div>
  )
}
