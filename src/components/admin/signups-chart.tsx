"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SignupsChart({ data }: { data: Array<{ day: string; signups: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval={4} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
          <Tooltip cursor={{ fillOpacity: 0.1 }} />
          <Bar dataKey="signups" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
