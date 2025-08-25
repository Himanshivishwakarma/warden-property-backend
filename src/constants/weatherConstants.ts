export const weatherCategories = {
  Clear: [0],
  Cloudy: [1, 2, 3],
  Drizzle: [51, 53, 55, 56, 57],
  Rainy: [61, 63, 65, 66, 67, 80, 81, 82],
  Snow: [71, 73, 75, 77, 85, 86]
} as const;

export type WeatherCondition = keyof typeof weatherCategories;

export function getWeatherCodesForCondition(condition: string): number[] {
  return [...(weatherCategories[condition as WeatherCondition] || [])];
}


export const WEATHER_CONSTRAINTS = {
  TEMPERATURE: { MIN: -20, MAX: 50 },
  HUMIDITY: { MIN: 0, MAX: 100 }
} as const;