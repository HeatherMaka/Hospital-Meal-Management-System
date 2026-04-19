import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../../styles/components/charts/BarChart.css'

// Interface for chart data
interface ChartData {
    [key: string]: any
}

// Added 'data:' property name (this was missing!)
interface BarChartProps {
    data: ChartData[]
    dataKey: string
    xAxisKey: string
    title?: string
    color?: string
    height?: number
}

export default function BarChart({
                                     data,
                                     dataKey,
                                     xAxisKey,
                                     title,
                                     color = '#3B82F6',
                                     height = 300,
                                 }: BarChartProps) {
    return (
        <div className="chart-container">
            {title && <h3 className="chart-title">{title}</h3>}
            <ResponsiveContainer width="100%" height={height}>
                <RechartsBarChart data={data}>
                    <XAxis dataKey={xAxisKey} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    )
}