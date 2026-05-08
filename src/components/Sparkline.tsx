import { useMemo } from 'react';

export function Sparkline({
  data,
  width = 80,
  height = 24,
  stroke = 'currentColor',
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const path = useMemo(() => {
    if (!data.length) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1 || 1);
    return data
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / span) * (height - 2) - 1;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} stroke={stroke} strokeWidth={1.25} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
