import { ReactNode, ButtonHTMLAttributes } from 'react'
import '../../styles/components/common/Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    children: ReactNode
    isLoading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
}

export default function Button({
                                   variant = 'primary',
                                   size = 'md',
                                   children,
                                   isLoading = false,
                                   leftIcon,
                                   rightIcon,
                                   disabled,
                                   className = '',
                                   ...props
                               }: ButtonProps) {
    return (
        <button
            className={`btn btn-${variant} btn-${size} ${isLoading ? 'btn-loading' : ''} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="btn-spinner"></span>
            ) : (
                <>
                    {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
                </>
            )}
        </button>
    )
}