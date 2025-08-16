// @ts-nocheck
export interface LatLng {
  lat: number;
  lng: number;
}

export interface AreaDefinition {
  name: string;
  coordinates: LatLng;
}

export enum TransportMode {
  WALK = 'walk',
  TRANSIT = 'transit',
  DRIVING = 'driving',
  CYCLING = 'cycling',
}

export interface LocalBusinessCategories {
  [genericCategory: string]: string | string[];
}

export interface DetailedAreaInfo extends AreaDefinition {
  type: 'neighborhood' | 'landmark' | 'district' | 'borough' | 'area';
  alternativeNames?: string[];
  commonMisspellings?: string[];
  parentArea?: string;
}

export interface CityConfig {
  slug: string;
  name: string;
  timezone: string;
  defaultLocation: LatLng;
  majorAreas: AreaDefinition[];
  detailedAreas?: DetailedAreaInfo[];
  transportModes: TransportMode[];
  averageTransportSpeed: Partial<Record<TransportMode, number>>;
  businessCategories: LocalBusinessCategories;
}
