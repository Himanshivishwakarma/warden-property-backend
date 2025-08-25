export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Weather API HTTP Error: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as any;
    
    if (!data.current_weather) {
      console.warn(`No current_weather in response for ${lat},${lon}`);
      return null;
    }
    
    const temperature = data.current_weather.temperature;
    const weatherCode = data.current_weather.weathercode;
    const humidity = data.hourly?.relativehumidity_2m?.[0] ?? 50;
        
    if (weatherCode === undefined || temperature === null) {
      console.error('Missing required weather data');
      return null;
    }
    
    const result = { temperature: Math.round(temperature), humidity: Math.round(humidity), weatherCode };
    return result;
  } catch (e: any) {
    console.error(`Weather API Error for ${lat},${lon}:`, e);
    return null;
  }
}