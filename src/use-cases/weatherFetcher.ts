export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
}

function getFallbackWeather(lat: number, lon: number): WeatherData {
  
  let temperature = 25; 
  let humidity = 65;
  let weatherCode = 1; 
  
  if (lat > 28) { 
    temperature = 22;
    humidity = 60;
  } else if (lat < 15) { 
    temperature = 28;
    humidity = 75;
  } else if (lat > 23) { 
    temperature = 26;
    humidity = 70;
  }
  
  const fallbackData = { temperature, humidity, weatherCode };
  const coordKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  if (!loggedCoordinates.has(coordKey)) {
    console.log(`FALLBACK DATA for ${lat},${lon}: ${temperature}°C, ${humidity}%, code: ${weatherCode}`);
    loggedCoordinates.add(coordKey);
  }
  
  return fallbackData;
}

const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const loggedCoordinates = new Set<string>();

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const coordKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(coordKey);
  

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    if (!loggedCoordinates.has(coordKey)) {
      console.log(`CACHED DATA for ${lat},${lon}: ${cached.data.temperature}°C, ${cached.data.humidity}%, code: ${cached.data.weatherCode}`);
      loggedCoordinates.add(coordKey);
    }
    return cached.data;
  }
  
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.status === 429) {
      console.warn(`Rate limited for ${lat},${lon}, using fallback`);
      return getFallbackWeather(lat, lon);
    }
    
    if (!response.ok) {
      console.error(`Weather API HTTP Error: ${response.status}`);
      return getFallbackWeather(lat, lon);
    }
    
    const data = await response.json() as any;
    
    if (!data.current_weather) {
      console.warn(`No current_weather in response for ${lat},${lon}`);
      return getFallbackWeather(lat, lon);
    }
    
    const temperature = data.current_weather.temperature;
    const weatherCode = data.current_weather.weathercode;
    const humidity = data.hourly?.relativehumidity_2m?.[0] ?? 65;
        
    if (weatherCode === undefined || temperature === null) {
      console.error('Missing required weather data');
      return getFallbackWeather(lat, lon);
    }
    
    const weatherData = { temperature: Math.round(temperature), humidity: Math.round(humidity), weatherCode };
    
    weatherCache.set(coordKey, { data: weatherData, timestamp: Date.now() });
    
    if (!loggedCoordinates.has(coordKey)) {
      console.log(`REAL API DATA for ${lat},${lon}: ${weatherData.temperature}°C, ${weatherData.humidity}%, code: ${weatherData.weatherCode}`);
      loggedCoordinates.add(coordKey);
    }
    
    return weatherData;
    
  } catch (e: any) {
    console.error(`Weather API Error for ${lat},${lon}:`, e.message);
    return getFallbackWeather(lat, lon);
  }
}