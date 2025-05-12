import { Injectable } from '@nestjs/common';

@Injectable()
export class GeolocationService {
  // Helper method to get location data from coordinates
  async getLocationDataFromCoordinates(latitude: number, longitude: number) {
    try {
      // Using the free Nominatim API (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'YourApp/1.0', // Required by Nominatim
          },
        },
      );

      const data = await response.json();

      if (!data || !data.address) {
        throw new Error('Invalid response from geocoding service');
      }

      const countryCode = data.address.country_code.toUpperCase();

      return {
        countryCode,
        countryName: data.address.country,
        region: data.address.state || data.address.region,
        currency: this.getCurrencyFromCountry(countryCode),
        averageCpmUsd: this.getAverageCpmForCountry(countryCode),
        language: this.getLanguageFromCountry(countryCode),
        timezone: this.getTimezoneFromCountry(countryCode),
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error(`Failed to get location data: ${error.message}`);
    }
  }

  private getCurrencyFromCountry(countryCode: string): string {
    // Basic mapping of country codes to currencies
    const countryCurrencyMap = {
      US: 'USD',
      GB: 'GBP',
      EU: 'EUR', // Not a country code but used for simplicity
      CA: 'CAD',
      AU: 'AUD',
      JP: 'JPY',
      CN: 'CNY',
      IN: 'INR',
      BR: 'BRL',
      RU: 'RUB',
      // Add more as needed
    };

    // Get the currency for the country or default to USD
    return countryCurrencyMap[countryCode] || 'USD';
  }

  private getAverageCpmForCountry(countryCode: string): number {
    // Example mapping of countries to CPM rates (in USD)
    const cpmRates = {
      US: 8.5,
      GB: 7.25,
      CA: 6.75,
      AU: 5.5,
      DE: 6.0,
      FR: 5.75,
      JP: 9.25,
      CN: 4.5,
      IN: 2.75,
      BR: 3.25,
      RU: 3.5,
      // Add more countries as needed
    };

    return cpmRates[countryCode] || 3.0; // Default to $3.00 if country not found
  }

  private getLanguageFromCountry(countryCode: string): string | null {
    // Basic mapping of country codes to common languages
    const countryToLanguage = {
      US: 'en',
      GB: 'en',
      CA: 'en-CA',
      AU: 'en-AU',
      FR: 'fr',
      DE: 'de',
      ES: 'es',
      IT: 'it',
      JP: 'ja',
      CN: 'zh',
      IN: 'hi',
      BR: 'pt-BR',
      RU: 'ru',
      // Add more as needed
    };

    return countryToLanguage[countryCode] || null;
  }

  private getTimezoneFromCountry(countryCode: string): string | null {
    // Simplified mapping of country codes to common timezones
    const countryToTimezone = {
      US: 'America/New_York', // Simplified, US has multiple
      GB: 'Europe/London',
      CA: 'America/Toronto', // Simplified, Canada has multiple
      AU: 'Australia/Sydney', // Simplified, Australia has multiple
      FR: 'Europe/Paris',
      DE: 'Europe/Berlin',
      ES: 'Europe/Madrid',
      IT: 'Europe/Rome',
      JP: 'Asia/Tokyo',
      CN: 'Asia/Shanghai', // Simplified, China has multiple
      IN: 'Asia/Kolkata',
      BR: 'America/Sao_Paulo', // Simplified, Brazil has multiple
      RU: 'Europe/Moscow', // Simplified, Russia has multiple
      // Add more as needed
    };

    return countryToTimezone[countryCode] || null;
  }
}
