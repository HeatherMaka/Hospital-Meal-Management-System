import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../../styles/components/charts/LineChart.css'

// Interface for chart data
interface ChartData {
    [key: string]: any
}

// 'data' property name is now included
interface LineChartProps {
    data: ChartData[]
    dataKey: string
    xAxisKey: string
    title?: string
    color?: string
    height?: number
}

export default function LineChart({
                                      data,
                                      dataKey,
                                      xAxisKey,
                                      title,
                                      color = '#3B82F6',
                                      height = 300,
                                  }: LineChartProps) {
    return (
        <div className="chart-container">
            {title && <h3 className="chart-title">{title}</h3>}
            <ResponsiveContainer width="100%" height={height}>
                <RechartsLineChart data={data}>
                    <XAxis dataKey={xAxisKey} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    )
}