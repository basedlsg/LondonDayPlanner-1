import React, { useRef } from 'react';
import QRCode from 'react-qr-code';

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
  const qrRef = useRef<HTMLDivElement>(null);
  
  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    
    try {
      // Find the SVG element within the QR code component
      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) return;
      
      // Convert SVG to canvas for download
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'itinerary-qr-code.png';
          a.click();
          URL.revokeObjectURL(url);
        });
        
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        ref={qrRef}
        className="border border-gray-200 rounded-lg shadow-sm bg-white p-4"
      >
        <QRCode
          value={url}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        Scan to view on mobile
      </p>
      <button
        onClick={handleDownloadQR}
        className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
      >
        Download QR Code
      </button>
    </div>
  );
};