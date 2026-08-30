import type { MonthlyPoint } from '../api';
import './MonthlyBarChart.css';

interface Props {
  title: string;
  points: MonthlyPoint[];
  variant: 'collected' | 'forecast';
}

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const monthFormat = new Intl.DateTimeFormat('he-IL', { month: 'short' });

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function MonthlyBarChart({ title, points, variant }: Props) {
  const max = Math.max(1, ...points.map((p) => p.amount));

  return (
    <div className={`bar-chart bar-chart-${variant}`}>
      <p className="bar-chart-title">{title}</p>
      <div className="bar-chart-bars">
        {points.map((point) => (
          <div className="bar-chart-col" key={point.month} title={currency.format(point.amount)}>
            <div className="bar-chart-track">
              <div
                className={`bar-chart-fill ${point.isCurrent ? 'bar-chart-fill-current' : ''}`}
                style={{ height: `${Math.max(2, (point.amount / max) * 100)}%` }}
              />
            </div>
            <span className="bar-chart-value">{currency.format(point.amount)}</span>
            <span className="bar-chart-label">{monthLabel(point.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
