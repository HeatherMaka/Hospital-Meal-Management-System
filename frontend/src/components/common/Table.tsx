import { ReactNode } from 'react'
import '../../styles/components/common/Table.css'

// Interface for table row data
interface TableRow {
    [key: string]: any
}

//  All properties properly defined
interface TableProps {
    columns: { key: string; label: string; render?: (value: any, row: TableRow) => ReactNode }[]
    data: TableRow[]
    onRowClick?: (row: TableRow) => void
    isLoading?: boolean
    emptyMessage?: string
}

export default function Table({
                                  columns,
                                  data,
                                  onRowClick,
                                  isLoading = false,
                                  emptyMessage = 'No data available',
                              }: TableProps) {
    if (isLoading) {
        return (
            <div className="table-loading">
                <div className="spinner"></div>
                <p>Loading data...</p>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="table-empty">
                <p>{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                <tr>
                    {columns.map((col) => (
                        <th key={col.key}>{col.label}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row: TableRow, rowIndex: number) => (
                    <tr
                        key={rowIndex}
                        onClick={() => onRowClick?.(row)}
                        className={onRowClick ? 'clickable' : ''}
                    >
                        {columns.map((col) => (
                            <td key={col.key}>
                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}