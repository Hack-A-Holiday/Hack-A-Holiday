import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
        // Forward cookies
        ...(req.headers.cookie && { Cookie: req.headers.cookie }),
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    // Forward the response status and data
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to backend service',
      details: error.message 
    });
  }
}
