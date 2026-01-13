import { useEffect, useRef, useState, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

/**
 * Hook pour gérer les gestures de swipe sur mobile
 * @param handlers - Handlers pour chaque direction de swipe
 * @param threshold - Distance minimale pour déclencher un swipe (en px)
 */
export const useSwipe = (handlers: SwipeHandlers, threshold: number = 50) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchEndX.current === null ||
      touchEndY.current === null
    ) {
      return;
    }

    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;

    // Détecter la direction principale du swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe horizontal
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      }
    } else {
      // Swipe vertical
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }

    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  }, [handlers, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

/**
 * Hook pour détecter le pinch-to-zoom
 */
export const usePinchZoom = (
  onZoomIn?: () => void,
  onZoomOut?: () => void,
  threshold: number = 50
) => {
  const initialDistance = useRef<number | null>(null);

  const getDistance = (touches: TouchList) => {
    const [touch1, touch2] = Array.from(touches);
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current !== null) {
        const currentDistance = getDistance(e.touches);
        const delta = currentDistance - initialDistance.current;

        if (Math.abs(delta) > threshold) {
          if (delta > 0 && onZoomIn) {
            onZoomIn();
          } else if (delta < 0 && onZoomOut) {
            onZoomOut();
          }
          initialDistance.current = currentDistance;
        }
      }
    },
    [onZoomIn, onZoomOut, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

/**
 * Hook pour détecter le long press
 */
export const useLongPress = (
  callback: () => void,
  duration: number = 500
) => {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      target.current = e.target;
      timeout.current = setTimeout(() => {
        callback();
      }, duration);
    },
    [callback, duration]
  );

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  };
};

/**
 * Hook pour détecter si l'utilisateur est sur mobile
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/**
 * Hook pour gérer le pull-to-refresh
 */
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Ne déclencher que si on est en haut de la page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null || window.scrollY > 0) return;

    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;

    // Si on tire vers le bas de plus de 100px
    if (delta > 100 && !isRefreshing) {
      // Visual feedback peut être ajouté ici
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (
      startY.current === null ||
      currentY.current === null ||
      isRefreshing
    )
      return;

    const delta = currentY.current - startY.current;

    if (delta > 100) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    startY.current = null;
    currentY.current = null;
  }, [onRefresh, isRefreshing]);

  return {
    isRefreshing,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
