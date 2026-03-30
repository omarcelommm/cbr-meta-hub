interface SemicircleGaugeProps {
  percent: number; // 0-150+
  meta?: number;
  className?: string;
}

type Zone = 'critico' | 'atencao' | 'ritmo' | 'superando';

function getZone(pct: number): Zone {
  if (pct < 50) return 'critico';
  if (pct < 80) return 'atencao';
  if (pct < 100) return 'ritmo';
  return 'superando';
}

const ZONE_COLORS: Record<Zone, string> = {
  critico: '#f87171',   // red-400
  atencao: '#fbbf24',   // amber-400
  ritmo: '#60a5fa',     // blue-400
  superando: '#4ade80', // green-400
};

const ZONE_LABELS: Record<Zone, string> = {
  critico: 'CRÍTICO',
  atencao: 'ATENÇÃO',
  ritmo: 'NO RITMO',
  superando: 'SUPERANDO',
};

export function SemicircleGauge({ percent, meta, className = '' }: SemicircleGaugeProps) {
  const zone = getZone(percent);
  const color = ZONE_COLORS[zone];
  const label = ZONE_LABELS[zone];

  // SVG semicircle: r=80, center=(100,100)
  // Arc from left (20,100) to right (180,100) going through top
  const r = 80;
  const circumference = Math.PI * r; // half-circle arc length ≈ 251.3
  const capped = Math.min(percent, 150); // cap visual at 150%
  const filled = circumference * (capped / 150);
  const offset = circumference - filled;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 200 110" className="w-56 h-auto overflow-visible">
        {/* Track */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
        {/* Center text */}
        <text
          x="100"
          y="82"
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          style={{ transition: 'fill 0.3s ease' }}
        >
          {percent.toFixed(1)}%
        </text>
        {meta !== undefined && (
          <text
            x="100"
            y="100"
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
          >
            Meta {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta)}
          </text>
        )}
      </svg>
      <span
        className="text-xs font-bold tracking-widest px-3 py-1 rounded-full border mt-1"
        style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
      >
        {label}
      </span>
    </div>
  );
}
