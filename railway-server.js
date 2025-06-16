// Simple Node.js server for Railway deployment
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
app.use(cors({
  origin: [
    'https://planyourperfectday.app',
    'https://www.planyourperfectday.app',
    'https://app.planyourperfectday.app',
    'https://planyourperfectday-app.netlify.app',
    'https://coruscating-shortbread-3eea56.netlify.app'
  ],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cities endpoint
app.get('/api/cities', (req, res) => {
  const cities = [
    { id: 'london', name: 'London', slug: 'london', timezone: 'Europe/London' },
    { id: 'nyc', name: 'New York City', slug: 'nyc', timezone: 'America/New_York' },
    { id: 'boston', name: 'Boston', slug: 'boston', timezone: 'America/New_York' },
    { id: 'austin', name: 'Austin', slug: 'austin', timezone: 'America/Chicago' }
  ];
  res.json(cities);
});

// Simple plan endpoint
app.post('/api/:city/plan', (req, res) => {
  res.json({ 
    message: 'Planning feature coming soon!', 
    city: req.params.city,
    query: req.body.query 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});