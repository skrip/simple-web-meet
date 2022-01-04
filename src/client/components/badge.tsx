import React, {useState, useEffect} from 'react';

export interface BadgeProps {
  title: string;
  className?: string;
  onClick?: () => void;
}
export function Badge(props: BadgeProps) {
  const [className, setclassName] = useState('');

  useEffect(() => {
    if (props.className) {
      setclassName(props.className);
    }
  }, [props.className]);

  const onClick = () => {
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-red-100 bg-blue-600 rounded-full ${className}`}
    >
      {props.title}
    </div>
  );
}
