import { ReactNode } from 'react'
import '../../styles/components/common/Card.css'

interface CardProps {
    children: ReactNode
    className?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    hover?: boolean
}

export default function Card({
                                 children,
                                 className = '',
                                 padding = 'md',
                                 hover = false,
                             }: CardProps) {
    return (
        <div className={`card card-${padding} ${hover ? 'card-hover' : ''} ${className}`}>
            {children}
        </div>
    )
}