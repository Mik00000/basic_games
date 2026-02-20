import { useState, useEffect } from "react";

/**
 * Hook to delay the visibility of a component.
 * Useful for preventing modals from flashing if the condition is met only briefly.
 *
 * @param isActive Boolean indicating if the component should be active/visible
 * @param delay Delay in milliseconds (default 1000ms)
 * @returns Boolean explicitly indicating if the component should be rendered
 */
export const useDelayedVisibility = (
  isActive: boolean,
  delay: number = 1000,
) => {
  const [isVisible, setIsVisible] = useState(false);

  // Reset immediately if not active (render-time update pattern)
  if (!isActive && isVisible) {
    setIsVisible(false);
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isActive) {
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }

    return () => clearTimeout(timeout);
  }, [isActive, delay]);

  return isVisible;
};
