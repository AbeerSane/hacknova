import { useMemo } from "react";

function toPathPoints(values, width, height, padding) {
 if (!values.length) {
  return "";
 }

 const min = Math.min(...values);
 const max = Math.max(...values);
 const range = Math.max(max - min, 1);
 const innerWidth = width - padding * 2;
 const innerHeight = height - padding * 2;

 return values
  .map((value, index) => {
   const x = padding + (index * innerWidth) / Math.max(values.length - 1, 1);
   const y = padding + innerHeight - ((value - min) / range) * innerHeight;
   return `${x},${y}`;
  })
  .join(" ");
}

export function MiniLineChart({ title, data, color = "#0f766e", valueSuffix = "", height = 160 }) {
 const safeData = Array.isArray(data) ? data.filter((item) => Number.isFinite(item)) : [];
 const width = 520;
 const padding = 22;

 const points = useMemo(() => toPathPoints(safeData, width, height, padding), [safeData, height]);
 const latest = safeData.length ? safeData[safeData.length - 1] : null;

 return (
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
   <div className="flex items-center justify-between mb-3">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-500">{latest !== null ? `Latest: ${latest}${valueSuffix}` : "No data"}</p>
   </div>

   {safeData.length > 1 ? (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={title}>
     <polyline fill="none" stroke="#dbeafe" strokeWidth="1" points={`${padding},${height - padding} ${width - padding},${height - padding}`} />
     <polyline fill="none" stroke="#dbeafe" strokeWidth="1" points={`${padding},${padding} ${padding},${height - padding}`} />
     <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
   ) : (
    <div className="text-sm text-slate-500 py-8 text-center">Add more records to see trend</div>
   )}
  </div>
 );
}

export function StatusBarChart({ title, items }) {
 const total = items.reduce((sum, item) => sum + item.value, 0);

 return (
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
   <p className="text-sm font-semibold text-slate-700 mb-3">{title}</p>
   <div className="space-y-3">
    {items.map((item) => {
     const widthPercent = total ? Math.round((item.value / total) * 100) : 0;
     return (
      <div key={item.label}>
       <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
        <span>{item.label}</span>
        <span>{item.value}</span>
       </div>
       <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${widthPercent}%`, backgroundColor: item.color }}></div>
       </div>
      </div>
     );
    })}
   </div>
  </div>
 );
}

export function RingProgressChart({ title, value, subtitle, color = "#0f766e" }) {
 const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
 const radius = 44;
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (safeValue / 100) * circumference;

 return (
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-4">
   <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0" role="img" aria-label={title}>
    <circle cx="55" cy="55" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
    <circle
     cx="55"
     cy="55"
     r={radius}
     fill="none"
     stroke={color}
     strokeWidth="10"
     strokeLinecap="round"
     strokeDasharray={circumference}
     strokeDashoffset={offset}
     transform="rotate(-90 55 55)"
    />
    <text x="55" y="60" textAnchor="middle" className="fill-slate-700 text-xl font-bold">{safeValue}%</text>
   </svg>
   <div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
   </div>
  </div>
 );
}
