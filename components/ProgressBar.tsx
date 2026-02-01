
import React from 'react';

interface ProgressBarProps {
  progress: number;
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  return (
    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
      <div 
        className="bg-indigo-600 h-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white drop-shadow-sm">
          {label} {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
