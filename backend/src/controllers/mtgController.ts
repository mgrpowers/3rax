import { Request, Response } from 'express';
import { ScryfallService } from '../services/scryfallService';
import path from 'path';

export const mtgController = {
  identify: async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const { cardName } = req.body; // Optional: if user provides card name directly

      if (!file && !cardName) {
        return res.status(400).json({ error: 'Either image file or card name is required' });
      }

      let card;

      if (cardName) {
        // Search by name first
        card = await ScryfallService.searchCardByName(cardName);
      } else if (file) {
        // For now, we'll need the user to provide the card name
        // Scryfall doesn't have a direct image recognition API
        // In the future, we could integrate with a service like Google Vision API
        // or use a local ML model
        return res.status(400).json({
          error: 'Card name is required. Image recognition is not yet implemented. Please provide the card name.',
        });
      }

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      res.json({
        card,
        message: 'Card identified successfully',
      });
    } catch (error) {
      console.error('Error identifying MTG card:', error);
      res.status(500).json({ error: 'Failed to identify card' });
    }
  },
};

