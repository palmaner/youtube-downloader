const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve your HTML file from /public (ensure youtube-downloader.html is there)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'youtube-downloader.html'));
});

// /info endpoint using Puppeteer to bypass YouTube's anti-bot detection.
app.get('/info', async (req, res) => {
  const url = req.query.url;
  console.log('Fetching info for URL:', url);

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        executablePath: process.env.CHROME_PATH || '/usr/bin/chromium'
      });
      
    const page = await browser.newPage();
    
    // Set realistic headers (optional, but helps mimic a real browser)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Extract video title using a DOM selector. Adjust as necessary.
    const videoTitle = await page.evaluate(() => {
      const titleElement = document.querySelector('h1.title, h1.ytd-video-primary-info-renderer');
      return titleElement ? titleElement.innerText : document.title;
    });
    
    await browser.close();
    
    res.json({ title: videoTitle });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch video info', 
      details: error.message
    });
  }
});

// /download endpoint can still use ytdl-core with custom headers.
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
