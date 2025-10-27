// api/cron.js - Daily Email Alerts (8am EST)
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROST_FREEZE_KEYWORDS = [
  'frost', 'freeze', 'freezing', 'hard freeze', 'killing frost'
];

// Get coordinates from ZIP code
async function getCoordinatesFromZip(zipCode) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!response.ok) throw new Error('Invalid ZIP code');
    
    const data = await response.json();
    return {
      latitude: parseFloat(data.places[0].latitude),
      longitude: parseFloat(data.places[0].longitude),
      city: data.places[0]['place name'],
      state: data.places[0]['state abbreviation']
    };
  } catch (error) {
    console.error(`Error getting coordinates for ZIP ${zipCode}:`, error);
    return null;
  }
}

// Get frost/freeze alerts
async function getAlertsForLocation(zipCode) {
  try {
    const location = await getCoordinatesFromZip(zipCode);
    if (!location) return { location: null, alerts: [] };

    // Get NWS point data
    const pointResponse = await fetch(
      `https://api.weather.gov/points/${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
      {
        headers: {
          'User-Agent': 'FrostFreezeChecker/2.0',
          'Accept': 'application/geo+json'
        }
      }
    );

    if (!pointResponse.ok) throw new Error('Failed to fetch NWS point data');
    const pointData = await pointResponse.json();
    const forecastZone = pointData.properties.forecastZone;

    // Get active alerts
    const alertsResponse = await fetch(
      `https://api.weather.gov/alerts/active?zone=${forecastZone.split('/').pop()}`,
      {
        headers: {
          'User-Agent': 'FrostFreezeChecker/2.0',
          'Accept': 'application/geo+json'
        }
      }
    );

    if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
    const alertsData = await alertsResponse.json();

    // Filter frost/freeze alerts
    const frostFreezeAlerts = alertsData.features.filter(alert => {
      const event = alert.properties.event.toLowerCase();
      const headline = (alert.properties.headline || '').toLowerCase();
      const description = (alert.properties.description || '').toLowerCase();
      
      return FROST_FREEZE_KEYWORDS.some(keyword => 
        event.includes(keyword) || headline.includes(keyword) || description.includes(keyword)
      );
    });

    return { location, alerts: frostFreezeAlerts };
  } catch (error) {
    console.error(`Error getting alerts for ZIP ${zipCode}:`, error);
    return { location: null, alerts: [] };
  }
}

// Generate plain English summary
function generatePlainEnglish(alertProps) {
  const event = alertProps.event.toLowerCase();
  const description = alertProps.description || '';
  const tempMatch = description.match(/(\d+)\s*(?:degrees?|°)/i);
  const temperature = tempMatch ? tempMatch[1] : null;

  let plainText = '';

  if (event.includes('freeze warning')) {
    plainText = `Freezing conditions expected. Temperatures will drop below 32°F${temperature ? ` (around ${temperature}°F)` : ''}. This can kill sensitive plants and damage exposed pipes. Bring plants indoors, cover outdoor faucets, and let faucets drip to prevent freezing.`;
  } else if (event.includes('frost advisory')) {
    plainText = `Frost is likely to form. Temperatures will drop to around 32-36°F. Tender plants may be damaged. Cover or bring in sensitive plants overnight.`;
  } else if (event.includes('hard freeze warning')) {
    plainText = `Hard freeze coming - very cold! Temperatures will fall well below 32°F${temperature ? ` (around ${temperature}°F)` : ''}. This will kill most vegetation and can burst pipes. Take immediate action to protect plants and plumbing.`;
  } else if (event.includes('freeze watch')) {
    plainText = `Freezing conditions are possible. There's a chance temperatures could drop below 32°F. Start preparing - monitor forecasts and be ready to protect plants and pipes.`;
  } else {
    plainText = `Cold weather alert. Temperatures will drop significantly. Take precautions to protect plants, pipes, and outdoor equipment.`;
  }

  return plainText;
}

// Generate email HTML
function generateEmailHTML(location, alerts, zipCode) {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f7fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background: white; border-left: 4px solid #f56565; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
        .clear-box { background: white; border-left: 4px solid #48bb78; padding: 20px; border-radius: 4px; }
        .plain-english { background: #edf2f7; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .footer { text-align: center; color: #718096; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        h1 { margin: 0; font-size: 28px; }
        h2 { color: #1a202c; margin-top: 0; }
        h3 { color: #2d3748; font-size: 16px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-alert { background: #fee2e2; color: #991b1b; }
        .badge-clear { background: #d1fae5; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❄️ Frost & Freeze Alert</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${date}</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;"><strong>Location:</strong> ${location.city}, ${location.state} (${zipCode})</p>
  `;

  if (alerts.length === 0) {
    html += `
      <div class="clear-box">
        <span class="badge badge-clear">✓ ALL CLEAR</span>
        <h2>No Frost or Freeze Alerts</h2>
        <p>There are currently no frost or freeze advisories, watches, or warnings in effect for your location.</p>
      </div>
    `;
  } else {
    html += `<span class="badge badge-alert">⚠️ ${alerts.length} ALERT${alerts.length > 1 ? 'S' : ''} ACTIVE</span>`;
    
    alerts.forEach(alert => {
      const props = alert.properties;
      const plainEnglish = generatePlainEnglish(props);
      
      html += `
        <div class="alert-box">
          <h2>${props.event}</h2>
          <div class="plain-english">
            <h3>💬 What This Means:</h3>
            <p>${plainEnglish}</p>
          </div>
          <div style="margin-top: 15px;">
            <h3>Official Details:</h3>
            <p style="font-size: 14px;">${props.headline || props.description.substring(0, 300) + '...'}</p>
          </div>
          <div style="margin-top: 15px; font-size: 13px; color: #718096;">
            <strong>Severity:</strong> ${props.severity || 'Unknown'} | 
            <strong>Effective:</strong> ${new Date(props.effective).toLocaleString()}
            ${props.expires ? ` | <strong>Expires:</strong> ${new Date(props.expires).toLocaleString()}` : ''}
          </div>
        </div>
      `;
    });
  }

  html += `
          <div class="footer">
            <p>You're receiving this email because you subscribed to daily frost and freeze alerts.</p>
            <p style="margin-top: 10px;"><a href="${process.env.VERCEL_URL || 'your-app-url'}/unsubscribe?email=${encodeURIComponent(location.email || '')}">Unsubscribe</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Send alert email
async function sendAlertEmail(email, zipCode) {
  try {
    const { location, alerts } = await getAlertsForLocation(zipCode);
    
    if (!location) {
      console.error(`Failed to get location for ZIP ${zipCode}`);
      return false;
    }

    const subject = alerts.length > 0 
      ? `⚠️ Frost/Freeze Alert for ${location.city}, ${location.state}`
      : `✓ All Clear - No Frost/Freeze Alerts for ${location.city}, ${location.state}`;

    const html = generateEmailHTML(location, alerts, zipCode);

    await sgMail.send({
      to: email,
      from: process.env.FROM_EMAIL,
      subject: subject,
      html: html
    });

    console.log(`✓ Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    return false;
  }
}

// Main cron handler
export default async function handler(req, res) {
  console.log('Starting daily alert cron job...');
  console.log('Time:', new Date().toISOString());

  try {
    // Get all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    console.log(`Found ${subscriptions.length} active subscription(s)`);

    let successCount = 0;
    let failCount = 0;

    // Send emails to all subscribers
    for (const subscription of subscriptions) {
      console.log(`Processing: ${subscription.email} (ZIP: ${subscription.zip_code})`);
      
      const success = await sendAlertEmail(subscription.email, subscription.zip_code);
      
      if (success) {
        successCount++;
        // Update last_sent timestamp
        await supabase
          .from('subscriptions')
          .update({ last_sent: new Date().toISOString() })
          .eq('id', subscription.id);
      } else {
        failCount++;
      }

      // Rate limiting - wait 1 second between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Completed: ${successCount} sent, ${failCount} failed`);

    return res.status(200).json({
      message: 'Cron job completed',
      total: subscriptions.length,
      success: successCount,
      failed: failCount
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ 
      error: 'Cron job failed',
      details: error.message 
    });
  }
}
