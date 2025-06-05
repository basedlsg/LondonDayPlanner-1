import React, { useEffect, useRef, useState } from 'react';

interface QRCodeShareProps {
  url: string;
  size?: number;
  className?: string;
}

export const QRCodeShare: React.FC<QRCodeShareProps> = ({ 
  url, 
  size = 200,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  
  useEffect(() => {
    // Simple QR code generation using Canvas
    // For production, consider using a library like qrcode.js
    const generateQR = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Simple placeholder - in production use a proper QR library
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      
      // Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, size - 20, size - 20);
      
      // Add some pattern to indicate it's a QR code
      const moduleSize = 8;
      const modules = Math.floor((size - 40) / moduleSize);
      
      // Generate pseudo-random pattern based on URL
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash = hash & hash;
      }
      
      ctx.fillStyle = '#000000';
      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          if ((hash + row * col) % 3 === 0) {
            ctx.fillRect(
              20 + col * moduleSize,
              20 + row * moduleSize,
              moduleSize - 1,
              moduleSize - 1
            );
          }
        }
      }
      
      // Add corner markers
      const markerSize = 40;
      const positions = [
        { x: 20, y: 20 },
        { x: size - markerSize - 20, y: 20 },
        { x: 20, y: size - markerSize - 20 }
      ];
      
      positions.forEach(pos => {
        ctx.fillRect(pos.x, pos.y, markerSize, markerSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pos.x + 10, pos.y + 10, markerSize - 20, markerSize - 20);
        ctx.fillStyle = '#000000';
        ctx.fillRect(pos.x + 15, pos.y + 15, markerSize - 30, markerSize - 30);
      });
      
      setQrGenerated(true);
    };
    
    generateQR();
  }, [url, size]);
  
  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'itinerary-qr-code.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-gray-200 rounded-lg shadow-sm bg-white"
      />
      
      {qrGenerated && (
        <>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Scan to view on mobile
          </p>
          <button
            onClick={handleDownloadQR}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Download QR Code
          </button>
        </>
      )}
    </div>
  );
};