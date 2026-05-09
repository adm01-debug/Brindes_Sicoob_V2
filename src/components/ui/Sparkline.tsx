import React from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ 
  data, 
  color = "#2EB086", 
  height = 20, 
  width = 60 
}: SparklineProps) {
  const chartData = data.map((v, i) => ({ value: v, index: i }));

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
