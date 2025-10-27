// api/subscribe.js - Vercel Serverless Function
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, zipCode } = req.body;

  // Validation
  if (!email || !zipCode) {
    return res.status(400).json({ error: 'Email and ZIP code are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!/^\d{5}$/.test(zipCode)) {
    return res.status(400).json({ error: 'Invalid ZIP code format' });
  }

  try {
    // Check if subscription exists
    const { data: existing, error: selectError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          zip_code: zipCode, 
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) throw updateError;

      return res.status(200).json({ 
        message: 'Subscription updated successfully',
        isNew: false
      });
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert([
          { 
            email, 
            zip_code: zipCode,
            active: true,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;

      return res.status(201).json({ 
        message: 'Subscription created successfully',
        isNew: true
      });
    }
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      error: 'Failed to process subscription',
      details: error.message 
    });
  }
}
