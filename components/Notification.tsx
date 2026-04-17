import React, { useState, useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-500 text-green-100';
      case 'error':
        return 'bg-red-600 border-red-500 text-red-100';
      case 'info':
        return 'bg-blue-600 border-blue-500 text-blue-100';
      case 'warning':
        return 'bg-yellow-500 border-yellow-400 text-yellow-950';
      default:
        return 'bg-gray-600 border-gray-500 text-gray-100';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'success':
        return 'OK';
      case 'error':
        return 'ERR';
      case 'info':
        return 'INFO';
      case 'warning':
        return 'WARN';
      default:
        return 'NOTE';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } ${getTypeStyles()}`}
    >
      <div className="flex items-start">
        <span className="text-xs font-bold mr-3 mt-1">{getLabel()}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-3 text-current opacity-70 hover:opacity-100"
        >
          x
        </button>
      </div>
    </div>
  );
};

interface NotificationManagerProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    addNotification?: (message: string, type?: NotificationType, duration?: number) => void;
  }
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
  }>>([]);

  const addNotification = (message: string, type: NotificationType = 'info', duration?: number) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  useEffect(() => {
    window.addNotification = addNotification;

    return () => {
      delete window.addNotification;
    };
  }, []);

  return (
    <>
      {children}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};
