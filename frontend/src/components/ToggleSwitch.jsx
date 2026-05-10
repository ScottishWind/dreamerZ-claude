import { useState } from 'react';

export const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  disabled = false, 
  label = '',
  size = 'md',
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setIsAnimating(true);
    onChange(!enabled);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-8'
  };

  const knobSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const knobTranslateClasses = {
    sm: enabled ? 'translate-x-4' : 'translate-x-0.5',
    md: enabled ? 'translate-x-6' : 'translate-x-0.5',
    lg: enabled ? 'translate-x-8' : 'translate-x-0.5'
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center gap-2 transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      type="button"
    >
      <div
        className={`
          relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out
          ${sizeClasses[size]}
          ${enabled ? 'bg-primary' : 'bg-slate-200'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out
            ${knobSizeClasses[size]}
            ${knobTranslateClasses[size]}
            ${isAnimating ? 'scale-90' : 'scale-100'}
          `}
        />
      </div>
      {label && (
        <span className={`text-sm font-medium ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>
          {label}
        </span>
      )}
    </button>
  );
};

export default ToggleSwitch;
