const express = require('express');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'youtube-downloader.html'));
});

app.get('/info', async (req, res) => {
    const url = req.query.url;
    console.log('Fetching info for URL:', url);

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url);
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
    console.log('Downloading video for URL:', url);

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        ytdl(url, { filter: 'audioandvideo', quality: 'highest' }).pipe(res);
    } catch (error) {
        console.error('Error downloading:', error.message);
        res.status(500).send('Error downloading video');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});