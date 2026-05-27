const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = 'https://kqjnogxwanwzfcvhirlc.supabase.co';
const supabaseKey = 'sb_publishable_UZGBN8_lYk90Ig-ekOeK2w_18Nfkg-t';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API: Get all data
app.get('/api/data', async (req, res) => {
  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Supabase read error:', error);
    return res.status(500).json({ error: 'Failed to read data' });
  }

  res.json(data.data);
});

// API: Update all data
app.put('/api/data', async (req, res) => {
  const { error } = await supabase
    .from('app_data')
    .update({ data: req.body })
    .eq('id', 1);

  if (error) {
    console.error('Supabase write error:', error);
    return res.status(500).json({ error: 'Failed to write data' });
  }

  res.json({ success: true });
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
