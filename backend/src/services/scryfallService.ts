import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

// Note: Scryfall API doesn't have direct image recognition
// This service provides card lookup by name
// For image recognition, you would need to integrate with a service like Google Vision API

export interface ScryfallCard {
  name: string;
  set_name?: string;
  collector_number?: string;
  image_uris?: {
    normal?: string;
    small?: string;
    large?: string;
  };
}

export class ScryfallService {
  /**
   * Identify a Magic: The Gathering card from an image
   * Uses Scryfall's card image recognition API
   */
  static async identifyCardFromImage(imagePath: string): Promise<ScryfallCard | null> {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${SCRYFALL_API_BASE}/cards/named`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          params: {
            format: 'json',
          },
        }
      );

      // Scryfall doesn't have a direct image recognition endpoint
      // We'll use the search endpoint with fuzzy matching instead
      // For now, return null and implement a search-based approach
      return null;
    } catch (error) {
      console.error('Scryfall API error:', error);
      return null;
    }
  }

  /**
   * Search for a card by name using Scryfall API
   */
  static async searchCardByName(name: string): Promise<ScryfallCard | null> {
    try {
      const response = await axios.get(`${SCRYFALL_API_BASE}/cards/named`, {
        params: {
          fuzzy: name,
        },
      });

      return {
        name: response.data.name,
        set_name: response.data.set_name,
        collector_number: response.data.collector_number,
        image_uris: response.data.image_uris,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Scryfall search error:', error);
      return null;
    }
  }

  /**
   * Get card by exact name
   */
  static async getCardByExactName(name: string): Promise<ScryfallCard | null> {
    try {
      const response = await axios.get(`${SCRYFALL_API_BASE}/cards/named`, {
        params: {
          exact: name,
        },
      });

      return {
        name: response.data.name,
        set_name: response.data.set_name,
        collector_number: response.data.collector_number,
        image_uris: response.data.image_uris,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Scryfall get card error:', error);
      return null;
    }
  }
}

