import { InputHTMLAttributes, forwardRef } from 'react'
import '../../styles/components/common/Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
        return (
            <div className={`input-wrapper ${className}`}>
                {label && <label className="input-label">{label}</label>}
                <div className="input-container">
                    {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
                    <input
                        ref={ref}
                        className={`input-field ${error ? 'input-error' : ''} ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
                        {...props}
                    />
                    {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
                </div>
                {error && <span className="input-error-message">{error}</span>}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input