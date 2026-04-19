import { ReactNode, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import '../../styles/components/common/Modal.css'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    showCloseButton?: boolean
}

export default function Modal({
                                  isOpen,
                                  onClose,
                                  title,
                                  children,
                                  size = 'md',
                                  showCloseButton = true,
                              }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content modal-${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    {showCloseButton && (
                        <button className="modal-close" onClick={onClose}>
                            <FiX />
                        </button>
                    )}
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    )
}