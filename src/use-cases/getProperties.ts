import { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { Prisma } from "@prisma/client";
import { fetchWeather, WeatherData } from "./weatherFetcher";
import { getWeatherCodesForCondition } from "../constants/weatherConstants";

interface WeatherFilters {
  minTemp?: number;
  maxTemp?: number;
  minHumidity?: number;
  maxHumidity?: number;
  weatherCondition?: string;
}

interface PropertyWithWeather {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  weather?: WeatherData;
}

export function buildPropertyWhere(
  req: Request
): Prisma.PropertyWhereInput | undefined {
  const { searchText } = req.query;

  if (typeof searchText !== "string") {
    return undefined;
  }

  if (!searchText || searchText.trim().length === 0) {
    return undefined;
  }

  const query = searchText.trim();

  return {
    OR: [
      { name: { contains: query } },
      { city: { contains: query } },
      { state: { contains: query } },
    ],
  };
}

function parseWeatherFilters(req: Request): WeatherFilters {
  const { minTemp, maxTemp, minHumidity, maxHumidity, weatherCondition } = req.query;
  
  return {
    minTemp: minTemp ? parseFloat(minTemp as string) : undefined,
    maxTemp: maxTemp ? parseFloat(maxTemp as string) : undefined,
    minHumidity: minHumidity ? parseFloat(minHumidity as string) : undefined,
    maxHumidity: maxHumidity ? parseFloat(maxHumidity as string) : undefined,
    weatherCondition: weatherCondition as string || undefined,
  };
}

function applyWeatherFilters(properties: PropertyWithWeather[], filters: WeatherFilters): PropertyWithWeather[] {
  return properties.filter(property => {
    if (!property.weather) {
      console.log(`Skipping property ${property.name} - no weather data`);
      return false;
    }
    
    const { temperature, humidity, weatherCode } = property.weather;
    
    if (filters.minTemp !== undefined && temperature < filters.minTemp) return false;
    if (filters.maxTemp !== undefined && temperature > filters.maxTemp) return false;
    if (filters.minHumidity !== undefined && humidity < filters.minHumidity) return false;
    if (filters.maxHumidity !== undefined && humidity > filters.maxHumidity) return false;
    
    if (filters.weatherCondition) {
      const allowedCodes = getWeatherCodesForCondition(filters.weatherCondition);
      if (!allowedCodes.includes(weatherCode)) return false;
    }
    
    return true;
  });
}

function generateEmptyMessage(filters: WeatherFilters, searchText?: string): string {
  if (searchText) {
    return `No properties found matching "${searchText}". Try different search terms.`;
  }
  
  if (filters.minTemp !== undefined || filters.maxTemp !== undefined) {
    const tempRange = `${filters.minTemp || -20}°C to ${filters.maxTemp || 50}°C`;
    return `No properties found with temperature in range ${tempRange}. Try adjusting the temperature filter.`;
  }
  
  if (filters.minHumidity !== undefined || filters.maxHumidity !== undefined) {
    const humidityRange = `${filters.minHumidity || 0}% to ${filters.maxHumidity || 100}%`;
    return `No properties found with humidity in range ${humidityRange}. Try adjusting the humidity filter.`;
  }
  
  if (filters.weatherCondition) {
    return `No properties found with "${filters.weatherCondition}" weather condition. Try a different weather filter.`;
  }
  
  return "No properties found matching your criteria. Try adjusting your filters.";
}

export const getProperties = async (req: Request, res: Response) => {
  try {
    const weatherFilters = parseWeatherFilters(req);
    const hasWeatherFilters = Object.values(weatherFilters).some(v => v !== undefined);
    const searchText = req.query.searchText as string;
    
    const properties = await prisma.property.findMany({
      take: hasWeatherFilters ? 100 : 20, 
      where: {
        ...buildPropertyWhere(req),
        lat: { not: null },
        lng: { not: null },
        isActive: true
      },
    });

    const propertiesWithWeather = await Promise.all(
      properties.map(async (property): Promise<PropertyWithWeather> => {
        if (!property.lat || !property.lng) {
          return property;
        }
        
        const weather = await fetchWeather(property.lat, property.lng);
        return { ...property, weather: weather || undefined };
      })
    );

    if (!hasWeatherFilters) {
      const finalProperties = propertiesWithWeather.slice(0, 20);
      return res.json({
        data: finalProperties,
        count: finalProperties.length,
        message: finalProperties.length === 0 ? generateEmptyMessage({}, searchText) : "Properties loaded successfully",
        hasFilters: false
      });
    }

    const propertiesWithValidWeather = propertiesWithWeather.filter(p => p.weather !== null && p.weather !== undefined);
    
    if (propertiesWithValidWeather.length === 0) {
      console.warn('No properties have valid weather data for filtering');
      return res.json({
        data: [],
        count: 0,
        message: "Weather data is currently unavailable. Please try again later.",
        hasFilters: true
      });
    }

    const filteredProperties = applyWeatherFilters(propertiesWithValidWeather, weatherFilters);
    const finalProperties = filteredProperties.slice(0, 20);
    
    return res.json({
      data: finalProperties,
      count: finalProperties.length,
      message: finalProperties.length === 0 ? generateEmptyMessage(weatherFilters, searchText) : "Properties filtered successfully",
      hasFilters: true,
      appliedFilters: weatherFilters
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return res.status(500).json({ 
      data: [],
      count: 0,
      message: "Server error occurred. Please try again later.",
      error: "Internal Server Error" 
    });
  }
};
