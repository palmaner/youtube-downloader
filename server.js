const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve your HTML interface from / (ensure youtube-downloader.html is in /public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'youtube-downloader.html'));
});

// Common headers to mimic a browser
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.youtube.com/',
};

app.get('/info', async (req, res) => {
  const url = req.query.url;
  console.log('Fetching info for URL:', url);

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: requestHeaders
      }
    });
    const videoData = {
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds
    };
    res.json(videoData);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch video info', 
      details: error.message
    });
  }
});

app.get('/download', async (req, res) => {
  const url = req.query.url;
  console.log('Downloading video from URL:', url);

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    // Optional: sanitize or derive a filename from the video title
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');

    ytdl(url, {
      filter: 'audioandvideo',
      quality: 'highest',
      requestOptions: {
        headers: requestHeaders
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
