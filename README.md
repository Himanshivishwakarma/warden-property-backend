# Warden Weather Test - Backend

A weather-based property search API that integrates with Open-Meteo weather service to provide real-time weather data for properties.

## Features

- Property search with text filtering
- Weather-based filtering (temperature, humidity, weather conditions)
- Real-time weather data integration using Open-Meteo API
- Express.js REST API

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database

### Installation

1. Clone the repository and navigate to backend:
```bash
cd warden-test-one
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client:
```bash
npm run prisma:gen
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Update `.env` with your database credentials (readonly credentials provided in .env.example)


### Running the Application

For Start the development server using this command:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### GET /get-properties

Search and filter properties with weather data.

**Query Parameters:**
- `searchText` - Text search in property name, city, or state
- `minTemp` - Minimum temperature filter (-20 to 50°C)
- `maxTemp` - Maximum temperature filter (-20 to 50°C)
- `minHumidity` - Minimum humidity filter (0 to 100%)
- `maxHumidity` - Maximum humidity filter (0 to 100%)
- `weatherCondition` - Weather condition filter (Clear, Cloudy, Drizzle, Rainy, Snow)

**Example:**
```
GET /get-properties?searchText=Mumbai&minTemp=20&maxTemp=35&weatherCondition=Clear
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Warden Mumbai 009",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "lat": 19.08719,
    "lng": 72.87539,
    "isActive": true,
    "weather": {
      "temperature": 28,
      "humidity": 65,
      "weatherCode": 0
    }
  }
]
```

## Weather Integration

The application integrates with Open-Meteo API to fetch real-time weather data:
- Temperature in Celsius
- Humidity percentage
- Weather codes following WMO standards

### Fallback Mechanism

To ensure reliable service, the application includes a robust fallback system:

**When fallback is used:**
- API rate limits (429 errors)
- Network timeouts or connection failures
- Invalid or missing weather data responses
- Open-Meteo service downtime

**Fallback data source:**
- Static weather data based on Indian city averages
- Geographic logic using latitude coordinates:
  - **Northern cities** (lat > 28): 22°C, 60% humidity (Delhi region)
  - **Southern cities** (lat < 15): 28°C, 75% humidity (Chennai, Kochi)
  - **Western cities** (lat > 23): 26°C, 70% humidity (Mumbai, Ahmedabad)
  - **Default**: 25°C, 65% humidity, partly cloudy (code: 1)

**Benefits:**
- Ensures weather filtering always works
- Provides realistic temperature ranges for testing
- Maintains good user experience during API outages
- Prevents empty results due to weather data failures

**Console logging:**
- `REAL API DATA` - Live data from Open-Meteo
- `FALLBACK DATA` - Static backup data used
- `CACHED DATA` - Previously fetched data reused

## Database Schema

Properties table includes:
- Basic property information (name, location)
- Geographic coordinates (lat, lng)
- Status and tags
- Weather data is fetched dynamically

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:gen` - Generate Prisma client
