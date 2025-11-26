import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  const baseStyle = "px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700",
    secondary: "bg-white text-gray-800 shadow-md hover:bg-gray-50 border border-gray-100",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-blue-50",
    danger: "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};