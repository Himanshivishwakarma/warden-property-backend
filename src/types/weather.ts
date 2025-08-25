export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
}

export interface WeatherFilters {
  minTemp?: number;
  maxTemp?: number;
  minHumidity?: number;
  maxHumidity?: number;
  weatherCondition?: string;
}

export type WeatherCondition = 'Clear' | 'Cloudy' | 'Drizzle' | 'Rainy' | 'Snow';