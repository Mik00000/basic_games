import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  actions,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }
        .modal-content {
          background: #1a1a1a;
          padding: 2rem;
          border-radius: 12px;
          min-width: 300px;
          max-width: 500px;
          border: 1px solid #333;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          color: white;
          animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-content h2 {
          margin-top: 0;
          border-bottom: 1px solid #333;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .modal-body {
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .modal-actions button {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .modal-actions button.primary {
          background: #3b82f6;
          color: white;
        }
        .modal-actions button.primary:hover {
          background: #2563eb;
        }
        .modal-actions button.secondary {
          background: #333;
          color: white;
        }
        .modal-actions button.secondary:hover {
          background: #444;
        }
        @keyframes modalPop {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
