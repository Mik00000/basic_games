import React from "react";

import { useDelayedVisibility } from "../../hooks/useDelayedVisibility";

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
  const shouldRender = useDelayedVisibility(isOpen, 500);

  if (!isOpen || !shouldRender) return null;

  return (
    <div className="pause-overlay" onClick={onClose}>
      <div className="pop-up" onClick={(e) => e.stopPropagation()}>
        <div className="content">
          <h1 className="heading">{title}</h1>
          <div className="modal-body">{children}</div>
          <div className="control-buttons">{actions}</div>
        </div>
      </div>
    </div>
  );
};
