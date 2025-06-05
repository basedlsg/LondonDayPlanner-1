import React, { useState } from 'react';
import { 
  Calendar, 
  Mail, 
  Share2, 
  Link, 
  Download, 
  Check, 
  X,
  FileText,
  Smartphone,
  QrCode,
  FileDown
} from 'lucide-react';
import { 
  exportToICS, 
  generateGoogleCalendarUrl, 
  generateEmailShareLink,
  copyItineraryToClipboard,
  type ExportOptions
} from '../lib/calendarExport';
import { QRCodeShare } from './QRCodeShare';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  venues: any[];
  travelInfo?: any[];
  title?: string;
  cityName?: string;
  timezone?: string;
  planDate?: string;
  itineraryUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  venues,
  travelInfo,
  title,
  cityName = 'City',
  timezone = 'UTC',
  planDate,
  itineraryUrl
}) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const exportOptions: ExportOptions = {
    venues,
    travelInfo,
    title,
    cityName,
    timezone,
    planDate,
    includeTravel: true,
    includeWeather: true
  };

  const handleCopyLink = async () => {
    if (itineraryUrl || window.location.href) {
      await navigator.clipboard.writeText(itineraryUrl || window.location.href);
      setCopiedStates({ ...copiedStates, link: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, link: false });
      }, 2000);
    }
  };

  const handleCopyItinerary = async () => {
    await copyItineraryToClipboard(exportOptions);
    setCopiedStates({ ...copiedStates, itinerary: true });
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, itinerary: false });
    }, 2000);
  };

  const handleICSExport = () => {
    setIsExporting(true);
    try {
      exportToICS(exportOptions);
      setCopiedStates({ ...copiedStates, ics: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, ics: false });
        setIsExporting(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  const handleGoogleCalendar = () => {
    // Add all events to Google Calendar
    venues.forEach((venue, index) => {
      const url = generateGoogleCalendarUrl(venue, exportOptions);
      // Open first event in new tab, others will be blocked by popup blocker
      if (index === 0) {
        window.open(url, '_blank');
      }
    });
    setCopiedStates({ ...copiedStates, google: true });
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, google: false });
    }, 2000);
  };

  const handleEmailShare = () => {
    const mailtoLink = generateEmailShareLink(exportOptions);
    window.location.href = mailtoLink;
  };

  const handleMobileShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || `${cityName} Day Planner`,
          text: `Check out my itinerary for ${cityName}!`,
          url: itineraryUrl || window.location.href
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    }
  };

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      // Extract itinerary ID from URL or use a prop
      const pathParts = window.location.pathname.split('/');
      const itineraryId = pathParts[pathParts.indexOf('itinerary') + 1];
      
      if (!itineraryId) {
        console.error('No itinerary ID found');
        return;
      }

      // Fetch PDF from API
      const response = await fetch(`/api/export/itineraries/${itineraryId}/pdf?city=${cityName}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('PDF export failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cityName}-itinerary-${itineraryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setCopiedStates({ ...copiedStates, pdf: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, pdf: false });
        setIsExporting(false);
      }, 2000);
    } catch (error) {
      console.error('PDF export failed:', error);
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300 scale-100">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Share & Export</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
            {/* Calendar Exports */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Add to Calendar</h3>
              
              <button
                onClick={handleICSExport}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Download Calendar File</div>
                    <div className="text-xs text-gray-500">Works with Apple, Outlook, etc.</div>
                  </div>
                </div>
                {copiedStates.ics ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Download className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <button
                onClick={handleGoogleCalendar}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Add to Google Calendar</div>
                    <div className="text-xs text-gray-500">Opens in new tab</div>
                  </div>
                </div>
                {copiedStates.google && <Check className="w-5 h-5 text-green-600" />}
              </button>
            </div>
            
            {/* Share Options */}
            <div className="space-y-2 pt-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Share Itinerary</h3>
              
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Link className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Copy Link</div>
                    <div className="text-xs text-gray-500">Share this page URL</div>
                  </div>
                </div>
                {copiedStates.link ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Share2 className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <button
                onClick={handleEmailShare}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Email Itinerary</div>
                    <div className="text-xs text-gray-500">Send via email client</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={handleCopyItinerary}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Copy as Text</div>
                    <div className="text-xs text-gray-500">Plain text format</div>
                  </div>
                </div>
                {copiedStates.itinerary ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <button
                onClick={handlePDFExport}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Download PDF</div>
                    <div className="text-xs text-gray-500">Beautiful PDF with maps</div>
                  </div>
                </div>
                {copiedStates.pdf ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Download className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {navigator.share && (
                <button
                  onClick={handleMobileShare}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Smartphone className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Share via Apps</div>
                      <div className="text-xs text-gray-500">Use system share sheet</div>
                    </div>
                  </div>
                  <Share2 className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* QR Code Section */}
            <div className="pt-3">
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <QrCode className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">QR Code</div>
                    <div className="text-xs text-gray-500">For easy mobile sharing</div>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${showQR ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {showQR && (
                <div className="mt-4 flex justify-center">
                  <QRCodeShare 
                    url={itineraryUrl || window.location.href}
                    size={180}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-5 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Tip: Calendar files include weather info and travel times
            </p>
          </div>
        </div>
      </div>
    </>
  );
};