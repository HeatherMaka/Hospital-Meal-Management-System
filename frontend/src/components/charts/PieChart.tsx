import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../../styles/components/charts/PieChart.css'

// Interface for chart data
interface ChartData {
    [key: string]: any
}

// 'data' property name is EXPLICITLY written below
interface PieChartProps {
    data: ChartData[]
    dataKey: string
    nameKey: string
    title?: string
    colors?: string[]
    height?: number
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function PieChart({
                                     data,
                                     dataKey,
                                     nameKey,
                                     title,
                                     colors = DEFAULT_COLORS,
                                     height = 300,
                                 }: PieChartProps) {
    return (
        <div className="chart-container">
            {title && <h3 className="chart-title">{title}</h3>}
            <ResponsiveContainer width="100%" height={height}>
                <RechartsPieChart>
                    <Pie
                        data={data}
                        dataKey={dataKey}
                        nameKey={nameKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </RechartsPieChart>
            </ResponsiveContainer>
        </div>
    )
}