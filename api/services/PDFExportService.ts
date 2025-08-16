// @ts-nocheck
import puppeteer from 'puppeteer';
import { Itinerary, ItineraryPlace, PlaceDetails } from '../../shared/schema';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CityConfig } from '../config/cities/types';

interface PDFExportOptions {
  includeMap?: boolean;
  includeWeather?: boolean;
  includeTransportation?: boolean;
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class PDFExportService {
  private readonly mapboxToken?: string;
  
  constructor(mapboxToken?: string) {
    this.mapboxToken = mapboxToken || process.env.MAPBOX_ACCESS_TOKEN;
  }

  async generateItineraryPDF(
    itinerary: Itinerary & { places: (ItineraryPlace & { details: PlaceDetails })[] },
    cityConfig: CityConfig,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const {
      includeMap = true,
      includeWeather = false,
      includeTransportation = true,
      paperSize = 'A4',
      orientation = 'portrait'
    } = options;

    // Generate HTML content
    const html = this.generateHTML(itinerary, cityConfig, {
      includeMap,
      includeWeather,
      includeTransportation
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Set HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: paperSize,
        landscape: orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  private generateHTML(
    itinerary: Itinerary & { places: (ItineraryPlace & { details: PlaceDetails })[] },
    cityConfig: CityConfig,
    options: { includeMap: boolean; includeWeather: boolean; includeTransportation: boolean }
  ): string {
    const planDate = itinerary.planDate ? new Date(itinerary.planDate) : new Date();
    const localDate = toZonedTime(planDate, cityConfig.timezone);
    const formattedDate = format(localDate, 'EEEE, MMMM d, yyyy');

    const mapUrl = options.includeMap ? this.generateStaticMapUrl(itinerary.places) : null;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      background: #ffffff;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #e5e7eb;
    }
    
    .logo {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 48px;
      font-weight: bold;
    }
    
    h1 {
      font-size: 36px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
    }
    
    .subtitle {
      font-size: 20px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .date {
      font-size: 18px;
      color: #9ca3af;
    }
    
    .map-container {
      margin: 30px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .map-container img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .timeline {
      margin-top: 40px;
    }
    
    .timeline-item {
      display: flex;
      margin-bottom: 30px;
      position: relative;
      padding-left: 40px;
    }
    
    .timeline-item::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 30px;
      bottom: -30px;
      width: 2px;
      background: #e5e7eb;
    }
    
    .timeline-item:last-child::before {
      display: none;
    }
    
    .timeline-marker {
      position: absolute;
      left: 0;
      top: 8px;
      width: 24px;
      height: 24px;
      background: #667eea;
      border-radius: 50%;
      border: 4px solid #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .timeline-content {
      flex: 1;
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .time {
      font-size: 16px;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 8px;
    }
    
    .venue-name {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    
    .activity {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    
    .address {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    
    .details {
      display: flex;
      gap: 20px;
      margin-top: 12px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .icon {
      width: 16px;
      height: 16px;
      opacity: 0.6;
    }
    
    .transport {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #9ca3af;
      font-style: italic;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
    
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    @media print {
      body {
        background: white;
      }
      .timeline-content {
        box-shadow: none;
        border: 1px solid #e5e7eb;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">P</div>
      <h1>${itinerary.title || `Your ${cityConfig.name} Adventure`}</h1>
      <div class="subtitle">${cityConfig.name} Day Planner</div>
      <div class="date">${formattedDate}</div>
    </div>
    
    ${mapUrl ? `
    <div class="map-container">
      <img src="${mapUrl}" alt="Route map" />
    </div>
    ` : ''}
    
    <div class="timeline">
      ${itinerary.places.map((place, index) => this.generateTimelineItem(place, index, options.includeTransportation)).join('')}
    </div>
    
    <div class="footer">
      <p>Generated with ❤️ by <a href="#">${cityConfig.name} Day Planner</a></p>
      <p>Have a wonderful time exploring ${cityConfig.name}!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateTimelineItem(
    place: ItineraryPlace & { details: PlaceDetails },
    index: number,
    includeTransportation: boolean
  ): string {
    const rating = place.details.rating ? `⭐ ${place.details.rating}` : '';
    const types = place.details.types?.slice(0, 2).map(t => t.replace(/_/g, ' ')).join(', ') || '';
    
    return `
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="time">${place.arrivalTime}</div>
          <div class="venue-name">${place.details.name}</div>
          <div class="activity">${place.activity}</div>
          <div class="address">${place.details.formatted_address}</div>
          
          <div class="details">
            ${rating ? `<div class="detail-item">${rating}</div>` : ''}
            ${types ? `<div class="detail-item">📍 ${types}</div>` : ''}
            ${place.duration ? `<div class="detail-item">⏱️ ${place.duration} minutes</div>` : ''}
          </div>
          
          ${includeTransportation && place.travelTime ? `
            <div class="transport">
              🚶 ${place.travelTime} minute ${place.travelMode || 'walk'} from previous location
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private generateStaticMapUrl(places: (ItineraryPlace & { details: PlaceDetails })[]): string {
    if (!this.mapboxToken || places.length === 0) return '';

    // Create markers for each location
    const markers = places.map((place, index) => {
      const lat = place.details.geometry.location.lat;
      const lng = place.details.geometry.location.lng;
      const label = (index + 1).toString();
      return `pin-l-${label}+667eea(${lng},${lat})`;
    }).join(',');

    // Create path between locations
    const coordinates = places.map(place => 
      `${place.details.geometry.location.lng},${place.details.geometry.location.lat}`
    ).join(',');
    
    const path = places.length > 1 ? `path-5+667eea-0.5(${coordinates})` : '';

    // Calculate bounds
    const lats = places.map(p => p.details.geometry.location.lat);
    const lngs = places.map(p => p.details.geometry.location.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding to bounds
    const latPadding = (maxLat - minLat) * 0.2;
    const lngPadding = (maxLng - minLng) * 0.2;
    
    const bounds = `[${minLng - lngPadding},${minLat - latPadding},${maxLng + lngPadding},${maxLat + latPadding}]`;

    // Use Google Static Maps API instead of Mapbox
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      size: '600x400',
      scale: '2',
      maptype: 'roadmap',
      key: process.env.GOOGLE_MAPS_API_KEY || ''
    });

    // Add markers
    places.forEach((place, index) => {
      params.append('markers', `color:0x667eea|label:${index + 1}|${place.details.geometry.location.lat},${place.details.geometry.location.lng}`);
    });

    // Add path if multiple locations
    if (places.length > 1) {
      const pathStr = places.map(p => `${p.details.geometry.location.lat},${p.details.geometry.location.lng}`).join('|');
      params.append('path', `color:0x667eea|weight:3|${pathStr}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }
}