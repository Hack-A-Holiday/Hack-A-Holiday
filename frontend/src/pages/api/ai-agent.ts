import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await axios.post('https://your-backend-url/plan-trip', {
      messages,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error communicating with backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}