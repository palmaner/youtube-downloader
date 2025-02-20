const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const ytdl = require('@distube/ytdl-core'); // Keep this for /download if needed

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve your HTML interface from / (ensure youtube-downloader.html is in /public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'youtube-downloader.html'));
});

// New /info route using Puppeteer to bypass bot checks without cookies
app.get('/info', async (req, res) => {
  const url = req.query.url;
  console.log('Fetching info for URL:', url);

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set a realistic user agent (optional, but can help)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36');
    
    // Navigate to the YouTube video page
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Example: Extract the video title using DOM selectors.
    // Note: You might need to adjust the selector if YouTube updates their page structure.
    const videoTitle = await page.evaluate(() => {
      const titleElement = document.querySelector('h1.title, h1.ytd-video-primary-info-renderer');
      return titleElement ? titleElement.innerText : document.title;
    });
    
    await browser.close();
    
    // Return the fetched title; you can add more properties as needed.
    res.json({ title: videoTitle });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch video info', 
      details: error.message
    });
  }
});

// /download endpoint can still use ytdl-core (with custom headers if needed)
app.get('/download', async (req, res) => {
  const url = req.query.url;
  console.log('Downloading video from URL:', url);

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    ytdl(url, {
      filter: 'audioandvideo',
      quality: 'highest',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
        }
      }
    }).pipe(res);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to download video', 
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
