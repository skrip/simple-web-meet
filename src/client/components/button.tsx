import React, {useState, useEffect} from 'react';

export interface ButtonProps {
  title: string;
  className?: string;
  onClick?: () => void;
}
export function Button(props: ButtonProps) {
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
      className={`lg:text-base text-5xl bg-blue-400 text-white text-center lg:w-64 w-full lg:p-2 p-6 lg:mt-2 mt-8 cursor-pointer hover:bg-blue-500 ${className}`}
    >
      {props.title}
    </div>
  );
}
