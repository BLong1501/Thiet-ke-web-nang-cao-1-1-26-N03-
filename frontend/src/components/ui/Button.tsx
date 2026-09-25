import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-base)',
    whiteSpace: 'nowrap',
    position: 'relative',
    overflow: 'hidden',
    letterSpacing: '0.01em',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '0.8rem' },
  md: { padding: '10px 20px', fontSize: '0.9rem' },
  lg: { padding: '13px 28px', fontSize: '1rem' },
  xl: { padding: '16px 36px', fontSize: '1.1rem' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const [hovered, setHovered] = React.useState(false);

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: hovered
        ? 'linear-gradient(135deg, #6d28d9 0%, #4338ca 50%, #0284c7 100%)'
        : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)',
      color: '#ffffff',
      boxShadow: hovered ? '0 6px 30px rgba(124, 58, 237, 0.5)' : '0 4px 20px rgba(124, 58, 237, 0.35)',
      transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    },
    secondary: {
      background: hovered ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)',
      color: '#a78bfa',
      border: '1px solid rgba(124, 58, 237, 0.3)',
    },
    outline: {
      background: 'transparent',
      color: hovered ? '#ffffff' : 'var(--text-primary)',
      border: `1px solid ${hovered ? 'var(--primary-500)' : 'var(--border-strong)'}`,
      boxShadow: hovered ? '0 0 0 1px var(--primary-500)' : 'none',
    },
    ghost: {
      background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
    },
    danger: {
      background: hovered ? '#dc2626' : '#ef4444',
      color: '#ffffff',
      boxShadow: hovered ? '0 4px 16px rgba(239, 68, 68, 0.4)' : 'none',
      transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    },
    success: {
      background: hovered ? '#059669' : '#10b981',
      color: '#ffffff',
      boxShadow: hovered ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
      transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => { setHovered(true); props.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); props.onMouseLeave?.(e); }}
      style={{
        ...styles.base,
        ...sizeStyles[size],
        ...variantStyles[variant],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled || isLoading ? 0.6 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {isLoading ? (
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
