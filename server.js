const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// ✅ Root route (fix for "Cannot GET /")
app.get('/', (req, res) => {
    res.send('YouTube Downloader API is running. Use /info or /download.');
});

app.get('/info', async (req, res) => {
    const url = req.query.url;
    console.log('Fetching info for URL:', url);

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'
                }
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
        res.header('Content-Disposition', 'attachment; filename="video.mp4"');

        ytdl(url, {
            filter: 'audioandvideo',
            quality: 'highest',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'
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
