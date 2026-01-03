import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const searchController = {
  search: async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Use PostgreSQL full-text search
      const items = await prisma.$queryRaw`
        SELECT 
          i.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', b.id,
                'name', b.name,
                'node', jsonb_build_object(
                  'id', n.id,
                  'name', n.name,
                  'description', n.description
                ),
                'quantity', ib.quantity
              )
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::json
          ) as locations
        FROM items i
        LEFT JOIN item_bins ib ON i.id = ib."itemId"
        LEFT JOIN bins b ON ib."binId" = b.id
        LEFT JOIN nodes n ON b."nodeId" = n.id
        WHERE 
          to_tsvector('english', COALESCE(i.name, '') || ' ' || COALESCE(i.description, '')) 
          @@ plainto_tsquery('english', ${q})
          OR i.name ILIKE ${`%${q}%`}
          OR i.description ILIKE ${`%${q}%`}
        GROUP BY i.id
        ORDER BY 
          ts_rank(
            to_tsvector('english', COALESCE(i.name, '') || ' ' || COALESCE(i.description, '')),
            plainto_tsquery('english', ${q})
          ) DESC,
          i.name ASC
        LIMIT 50
      `;

      // Alternative simpler approach using Prisma if raw query doesn't work as expected
      const itemsAlt = await prisma.item.findMany({
        where: {
          OR: [
            {
              name: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: q,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          itemBins: {
            include: {
              bin: {
                include: {
                  node: true,
                },
              },
            },
          },
        },
        take: 50,
      });

      // Format response with location information
      const formattedItems = itemsAlt.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        imagePath: item.imagePath,
        qrCode: item.qrCode,
        locations: item.itemBins.map(itemBin => ({
          bin: {
            id: itemBin.bin.id,
            name: itemBin.bin.name,
            node: itemBin.bin.node,
          },
          quantity: itemBin.quantity,
        })),
        totalQuantity: item.itemBins.reduce((sum, itemBin) => sum + itemBin.quantity, 0),
      }));

      res.json({
        query: q,
        results: formattedItems,
        count: formattedItems.length,
      });
    } catch (error) {
      console.error('Error searching items:', error);
      res.status(500).json({ error: 'Failed to search items' });
    }
  },
};

