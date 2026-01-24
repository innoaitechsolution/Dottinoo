'use client'

interface StackedBarChartProps {
  data: {
    assigned: number
    submitted: number
    reviewed: number
  }
  width?: number
  height?: number
}

export function StackedBarChart({ data, width = 400, height = 200 }: StackedBarChartProps) {
  // Ensure no NaN values
  const assigned = Number.isNaN(data.assigned) ? 0 : Math.max(0, data.assigned)
  const submitted = Number.isNaN(data.submitted) ? 0 : Math.max(0, data.submitted)
  const reviewed = Number.isNaN(data.reviewed) ? 0 : Math.max(0, data.reviewed)
  
  const max = Math.max(assigned, submitted, reviewed, 1)
  const barWidth = width * 0.6
  const barHeight = height * 0.6
  const x = width * 0.2
  const y = height * 0.2

  const assignedHeight = (assigned / max) * barHeight
  const submittedHeight = (submitted / max) * barHeight
  const reviewedHeight = (reviewed / max) * barHeight

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={x}
          y1={y + barHeight - ratio * barHeight}
          x2={x + barWidth}
          y2={y + barHeight - ratio * barHeight}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* Stacked bars */}
      {/* Reviewed (bottom) */}
      {reviewedHeight > 0 && (
        <rect
          x={x}
          y={y + barHeight - reviewedHeight}
          width={barWidth}
          height={reviewedHeight}
          fill="#90E9D5"
          stroke="#133E6C"
          strokeWidth="1"
        />
      )}

      {/* Submitted (middle) */}
      {submittedHeight > reviewedHeight && (
        <rect
          x={x}
          y={y + barHeight - submittedHeight}
          width={barWidth}
          height={submittedHeight - reviewedHeight}
          fill="#93CEEE"
          stroke="#133E6C"
          strokeWidth="1"
        />
      )}

      {/* Assigned (top) */}
      {assignedHeight > submittedHeight && (
        <rect
          x={x}
          y={y + barHeight - assignedHeight}
          width={barWidth}
          height={assignedHeight - submittedHeight}
          fill="#D9EAF9"
          stroke="#133E6C"
          strokeWidth="1"
        />
      )}

      {/* Labels */}
      <text
        x={x + barWidth / 2}
        y={y + barHeight + 20}
        textAnchor="middle"
        fontSize="12"
        fill="#133E6C"
        fontWeight="600"
      >
        Assignment Status
      </text>

      {/* Legend */}
      <g transform={`translate(${x + barWidth + 20}, ${y})`}>
        <rect x="0" y="0" width="12" height="12" fill="#D9EAF9" stroke="#133E6C" strokeWidth="1" />
        <text x="18" y="10" fontSize="10" fill="#133E6C">Assigned ({assigned})</text>
        
        <rect x="0" y="20" width="12" height="12" fill="#93CEEE" stroke="#133E6C" strokeWidth="1" />
        <text x="18" y="30" fontSize="10" fill="#133E6C">Submitted ({submitted})</text>
        
        <rect x="0" y="40" width="12" height="12" fill="#90E9D5" stroke="#133E6C" strokeWidth="1" />
        <text x="18" y="50" fontSize="10" fill="#133E6C">Reviewed ({reviewed})</text>
      </g>
    </svg>
  )
}

interface LineChartProps {
  data: Array<{ date: string; stars: number }>
  width?: number
  height?: number
}

export function LineChart({ data, width = 600, height = 200 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontSize="14"
          fill="#666"
        >
          No data available
        </text>
      </svg>
    )
  }

  // Ensure no NaN values in data
  const safeData = data.map(d => ({
    date: d.date,
    stars: Number.isNaN(d.stars) ? 0 : Math.max(0, d.stars),
  }))

  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxStars = Math.max(...safeData.map(d => d.stars), 1)
  const minStars = 0

  const xScale = (index: number) => padding.left + (index / (safeData.length - 1 || 1)) * chartWidth
  const yScale = (value: number) => {
    const safeValue = Number.isNaN(value) ? 0 : Math.max(0, value)
    return padding.top + chartHeight - ((safeValue - minStars) / (maxStars - minStars || 1)) * chartHeight
  }

  // Build path for line
  const pathData = safeData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.stars)}`)
    .join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + chartHeight - ratio * chartHeight
        const value = Math.round(minStars + ratio * (maxStars - minStars))
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#666"
            >
              {value}
            </text>
          </g>
        )
      })}

      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke="#4196E2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {safeData.map((d, i) => (
        <circle
          key={i}
          cx={xScale(i)}
          cy={yScale(d.stars)}
          r="4"
          fill="#4196E2"
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* X-axis labels */}
      {safeData.map((d, i) => {
        const x = xScale(i)
        const date = new Date(d.date)
        const label = `${date.getDate()}/${date.getMonth() + 1}`
        return (
          <text
            key={i}
            x={x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {label}
          </text>
        )
      })}

      {/* Y-axis label */}
      <text
        x={padding.left - 30}
        y={padding.top + chartHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#133E6C"
        transform={`rotate(-90, ${padding.left - 30}, ${padding.top + chartHeight / 2})`}
      >
        Stars
      </text>

      {/* Title */}
      <text
        x={width / 2}
        y={padding.top - 5}
        textAnchor="middle"
        fontSize="14"
        fill="#133E6C"
        fontWeight="600"
      >
        Stars Awarded Over Time
      </text>
    </svg>
  )
}
