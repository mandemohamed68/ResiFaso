import React from 'react';

export const ChristmasLights: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-8 pointer-events-none z-[99999] overflow-hidden select-none">
      <ul className="lightrope">
        {Array.from({ length: 42 }).map((_, i) => (
          <li key={i} />
        ))}
      </ul>
      <style>{`
        .lightrope {
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          position: absolute;
          z-index: 1;
          margin: -15px 0 0 0;
          padding: 0;
          pointer-events: none;
          width: 100%;
        }
        .lightrope li {
          position: relative;
          animation-fill-mode: both;
          animation-iteration-count: infinite;
          list-style: none;
          margin: 0;
          padding: 0;
          display: inline-block;
          width: 12px;
          height: 28px;
          border-radius: 50%;
          margin: 10px;
          background: #00f7a5;
          box-shadow: 0px 4px 24px 3px #00f7a5;
          animation-name: flash-1;
          animation-duration: 2s;
        }
        .lightrope li:nth-child(2n+1) {
          background: #00f7a5;
          box-shadow: 0px 4px 24px 3px rgba(0, 247, 165, 0.5);
          animation-name: flash-2;
          animation-duration: 0.4s;
        }
        .lightrope li:nth-child(4n+2) {
          background: #f39c12;
          box-shadow: 0px 4px 24px 3px rgba(243, 156, 18, 0.5);
          animation-name: flash-3;
          animation-duration: 1.1s;
        }
        .lightrope li:nth-child(odd) {
          animation-duration: 1.8s;
        }
        .lightrope li:nth-child(3n) {
          animation-duration: 1.4s;
        }
        .lightrope li:before {
          content: "";
          position: absolute;
          background: #222;
          width: 10px;
          height: 9px;
          border-radius: 3px;
          top: -5px;
          left: 1px;
        }
        .lightrope li:after {
          content: "";
          top: -14px;
          left: 9px;
          position: absolute;
          width: 24px;
          height: 18px;
          border-bottom: solid #222 2px;
          border-radius: 50%;
        }
        .lightrope li:last-child:after {
          content: none;
        }
        @keyframes flash-1 {
          0%, 100% { background: #00f7a5; box-shadow: 0px 4px 24px 3px #00f7a5; }
          50% { background: rgba(0, 247, 165, 0.2); box-shadow: 0px 4px 24px 3px rgba(0, 247, 165, 0.1); }
        }
        @keyframes flash-2 {
          0%, 100% { background: #ef4444; box-shadow: 0px 4px 24px 3px #ef4444; }
          50% { background: rgba(239, 68, 68, 0.2); box-shadow: 0px 4px 24px 3px rgba(239, 68, 68, 0.1); }
        }
        @keyframes flash-3 {
          0%, 100% { background: #facc15; box-shadow: 0px 4px 24px 3px #facc15; }
          50% { background: rgba(250, 204, 21, 0.2); box-shadow: 0px 4px 24px 3px rgba(250, 204, 21, 0.1); }
        }
      `}</style>
    </div>
  );
};
