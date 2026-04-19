import '../../styles/components/common/LoadingSpinner.css'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
}

export default function LoadingSpinner({
                                           size = 'md',
                                           text = 'Loading...',
                                       }: LoadingSpinnerProps) {
    return (
        <div className={`loading-spinner loading-spinner-${size}`}>
            <div className="spinner-ring"></div>
            {text && <p className="spinner-text">{text}</p>}
        </div>
    )
}