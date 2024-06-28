const express = require('express');
const ytdl = require('ytdl-core');
// const ffmpeg = require('fluent-ffmpeg');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require("fs")
const https = require("https")
const ffmpegPath = require('ffmpeg-static');
// console.log('ffmpeg path is :', ffmpegPath);
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg"));

// const ffmpegPath = require('ffmpeg-static');
// console.log('ffmpeg path is :', ffmpegPath);
// ffmpeg.setFfmpegPath(path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg"));

const app = express();
const port = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, "Public")))
app.use(bodyParser.json());

const sanitizeFilename = (filename) => {
    // Replace any invalid characters with underscores
    let newtitle = filename.replace(/[^\x00-\x7F]/g, '');
    return newtitle.replace(/[/\\?%*:|"<>]/g, '_');
};

function extractVideoId(url) {
    // Regular expression to match YouTube video ID
    const pattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    // Extract video ID using regex
    const match = url.match(pattern);

    // If match is found, return the video ID; otherwise, return null
    return match ? match[1] : null;
}
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/Page" + '/index.html');
});


app.get('/download', async (req, res) => {
    const videoURL = req.query.url;


    console.log(videoURL)
    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        const videoFile = 'video.mp4';
        const audioFile = 'audio.mp4';
        const outputFile = 'output.mp4';

        const videoStream = ytdl(videoURL, { format: videoFormat });
        const audioStream = ytdl(videoURL, { format: audioFormat });

        const videoWriteStream = fs.createWriteStream(videoFile);
        const audioWriteStream = fs.createWriteStream(audioFile);

        // Handle stream completion for both video and audio
        let videoDownloaded = false;
        let audioDownloaded = false;

        videoStream.pipe(videoWriteStream);
        audioStream.pipe(audioWriteStream);



        videoWriteStream.on('finish', () => {
            videoDownloaded = true;
            if (audioDownloaded) {
                mergeStreams();
            }
        });

        audioWriteStream.on('finish', () => {
            audioDownloaded = true;
            if (videoDownloaded) {
                mergeStreams();
            }
        });

        const mergeStreams = () => {
            ffmpeg()
                .input(videoFile)
                .videoCodec('copy')
                .input(audioFile)
                .audioCodec('copy')
                .save(outputFile)
                .on('end', () => {
                    // Set headers before sending the file
                    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
                    res.sendFile(__dirname + '/' + outputFile, (err) => {
                        if (err) {
                            console.error('Failed to send the file:', err);


                            // Always delete temporary files after sending the response
                            fs.unlink(audioFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(videoFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(outputFile, (err) => {
                                if (err) console.error('Failed to delete output file:', err);
                            });


                            res.status(500).send('Failed to send the file');
                        } else {
                            console.log('File sent successfully');
                            // Delete temporary files after sending the response

                            // Always delete temporary files after sending the response
                            fs.unlink(audioFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(videoFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(outputFile, (err) => {
                                if (err) console.error('Failed to delete output file:', err);
                            });

                        }
                    });
                })
                .on('error', (err) => {
                    console.error('Error merging video and audio:', err);

                    // Always delete temporary files after sending the response
                    fs.unlink(audioFile, (err) => {
                        if (err) console.error('Failed to delete audio file:', err);
                    });
                    fs.unlink(outputFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });
                    fs.unlink(videoFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });

                    res.status(500).send('Failed to merge video and audio');
                });
        };


    } catch (error) {
        console.error('Error fetching video information or downloading:', error);
        res.status(500).send('Failed to download video');
    }
});

app.post('/download', (req, res) => {
    const { downloadLink, type } = req.body;
    const videoUrl = downloadLink;
    // console.log(videoUrl)

    try {
        const urlObj = new URL(videoUrl);
        // console.log("url object is ", urlObj)
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };
        const request = https.request(options, (response) => {
            if (response.statusCode !== 200) {
                console.error(`Error fetching video: ${response.statusCode}`);
                res.status(500).send('Failed to download video');
                return;
            }

            res.setHeader('Content-Disposition', `attachment; filename="${type === 'Video' ? 'video.mp4' : 'audio.mp3'}"`);
            const contentType = type === 'Video' ? 'video/mp4' : 'audio/mpeg';
            res.setHeader('Content-Type', contentType);
            console.log("3")


            const contentLength = response.headers['content-length'];
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }
            console.log("piping", contentType)

            response.pipe(res);
        });

        request.on('error', (err) => {
            console.error('Error fetching video:', err);
            res.status(500).send('Failed to download video');
        });

        request.on('timeout', () => {
            console.error('Request timeout while fetching video');
            return res.status(500).send('Request timeout while fetching video');
        });

        request.end();
    } catch (err) {
        console.error('Invalid URL:', err);
        return res.status(400).send('Invalid URL');
    }
});




app.get('/getLinks', async (req, res) => {
    const videoURL = `https://www.youtube.com/watch?v=${req.query.v}`;
    console.log("requested video url is ", videoURL)
    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        // console.log(info)
        const title = sanitizeFilename(info.videoDetails.title);
        const videoFormats = info.formats.filter((format) => {
            return format.hasAudio && format.hasVideo
        })
        const audioFormats = info.formats.filter(format => {
            return format.hasAudio
            // && ['mp4a.40.2', 'mp4a.40.5', 'mp3'].some(codec => format.codecs.includes(codec));
        });
        // Set Content-Disposition header to trigger download for the video
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            title: title,
            videoDownloadLinks: videoFormats,
            audioDownloadLinks: audioFormats
        });
    } catch (error) {
        console.error('Error fetching video information:', error);
        res.status(500).send('Failed to fetch video information');
    }
});



app.get('/download-audio', async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        if (!audioFormat || !audioFormat.hasAudio) {
            return res.status(400).send('Audio format not available');
        }

        const audioFile = 'audio.mp4';
        const outputFile = 'output.mp4';

        const audioStream = ytdl(videoURL, { format: audioFormat });

        const audioWriteStream = fs.createWriteStream(audioFile);

        audioStream.pipe(audioWriteStream);

        audioWriteStream.on('finish', () => {
            ffmpeg()
                .input(audioFile)
                .audioCodec('copy')
                .save(outputFile)
                .on('end', () => {
                    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
                    res.sendFile(__dirname + '/' + outputFile, (err) => {
                        if (err) {
                            console.error('Failed to send the file:', err);

                            // Always delete temporary files after sending the response
                            fs.unlink(audioFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(outputFile, (err) => {
                                if (err) console.error('Failed to delete output file:', err);
                            });

                            res.status(500).send('Failed to send the file');
                        } else {
                            console.log('Audio File sent successfully');
                            // Delete temporary files after sending the response
                            fs.unlinkSync(audioFile);
                            fs.unlinkSync(outputFile);
                        }
                    });
                })
                .on('error', (err) => {

                    // Always delete temporary files after sending the response
                    fs.unlink(audioFile, (err) => {
                        if (err) console.error('Failed to delete audio file:', err);
                    });
                    fs.unlink(outputFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });

                    console.error('Error merging audio:', err);
                    res.status(500).send('Failed to merge audio');

                });
        });

    } catch (error) {
        console.error('Error fetching video information or downloading:', error);
        res.status(500).send('Failed to download video');
    }
});


app.get('/listen', async (req, res) => {
    console.log("request to get audio file received")
    const videoID = req.query.v;
    const newVideoUrl = `https://www.youtube.com/watch?v=${videoID}`;

    try {
        console.log(newVideoUrl);
        const info = await ytdl.getInfo(newVideoUrl);
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        const audioStream = ytdl(newVideoUrl, { format: audioFormat });

        res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        ffmpeg(audioStream)
            .audioBitrate(320)
            .format('mp3')
            .on('end', () => {
                console.log('Audio file sent successfully');
            })
            .on('error', (err) => {
                console.error('Error converting audio to MP3:', err);

                res.status(500).send('Failed to convert audio to MP3');
            })
            .pipe(res, { end: true });

    } catch (error) {
        console.error('Error fetching video information or downloading:', error);
        res.status(500).send('Failed to download video');
    }
});

app.get('/watch', async (req, res) => {
    const videoID = req.query.v
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`


    console.log(videoURL)
    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        const videoFile = 'video.mp4';
        const audioFile = 'audio.mp4';
        const outputFile = 'output.mp4';

        const videoStream = ytdl(videoURL, { format: videoFormat });
        const audioStream = ytdl(videoURL, { format: audioFormat });

        const videoWriteStream = fs.createWriteStream(videoFile);
        const audioWriteStream = fs.createWriteStream(audioFile);

        // Handle stream completion for both video and audio
        let videoDownloaded = false;
        let audioDownloaded = false;

        videoStream.pipe(videoWriteStream);
        audioStream.pipe(audioWriteStream);



        videoWriteStream.on('finish', () => {
            videoDownloaded = true;
            if (audioDownloaded) {
                mergeStreams();
            }
        });

        audioWriteStream.on('finish', () => {
            audioDownloaded = true;
            if (videoDownloaded) {
                mergeStreams();
            }
        });

        const mergeStreams = () => {
            ffmpeg()
                .input(videoFile)
                .videoCodec('copy')
                .input(audioFile)
                .audioCodec('copy')
                .save(outputFile)
                .on('end', () => {
                    // Set headers before sending the file
                    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
                    res.sendFile(__dirname + '/' + outputFile, (err) => {
                        if (err) {
                            console.error('Failed to send the file:', err);


                            // Always delete temporary files after sending the response
                            fs.unlink(audioFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(videoFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(outputFile, (err) => {
                                if (err) console.error('Failed to delete output file:', err);
                            });


                            res.status(500).send('Failed to send the file');
                        } else {
                            console.log('File sent successfully');
                            // Delete temporary files after sending the response

                            // Always delete temporary files after sending the response
                            fs.unlink(audioFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(videoFile, (err) => {
                                if (err) console.error('Failed to delete audio file:', err);
                            });
                            fs.unlink(outputFile, (err) => {
                                if (err) console.error('Failed to delete output file:', err);
                            });

                        }
                    });
                })
                .on('error', (err) => {
                    console.error('Error merging video and audio:', err);

                    // Always delete temporary files after sending the response
                    fs.unlink(audioFile, (err) => {
                        if (err) console.error('Failed to delete audio file:', err);
                    });
                    fs.unlink(outputFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });
                    fs.unlink(videoFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });

                    res.status(500).send('Failed to merge video and audio');
                });
        };


    } catch (error) {
        console.error('Error fetching video information or downloading:', error);
        res.status(500).send('Failed to download video');
    }
});

app.get('/download-mp3', async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        if (!audioFormat || !audioFormat.hasAudio) {
            return res.status(400).send('Audio format not available');
        }

        const audioFile = 'audio.mp4';
        const outputFile = 'output.mp3';

        const audioStream = ytdl(videoURL, { format: audioFormat });

        const audioWriteStream = fs.createWriteStream(audioFile);

        audioStream.pipe(audioWriteStream);

        audioWriteStream.on('finish', () => {
            ffmpeg()
                .input(audioFile)
                .audioCodec('libmp3lame')
                .save(outputFile)
                .on('end', () => {

                    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
                    res.sendFile(__dirname + '/' + outputFile, (err) => {
                        if (err) {
                            console.error('Failed to send the file:', err);
                            res.status(500).send('Failed to send the file');
                        } else {
                            console.log('Audio File sent successfully');
                            // Delete temporary files after sending the response
                            fs.unlinkSync(audioFile);
                            fs.unlinkSync(outputFile);
                        }
                    });
                })
                .on('error', (err) => {

                    // Always delete temporary files after sending the response
                    fs.unlink(audioFile, (err) => {
                        if (err) console.error('Failed to delete audio file:', err);
                    });
                    fs.unlink(outputFile, (err) => {
                        if (err) console.error('Failed to delete output file:', err);
                    });

                    console.error('Error merging audio:', err);
                    res.status(500).send('Failed to merge audio');
                });
        });

    } catch (error) {

        console.error('Error fetching video information or downloading:', error);
        res.status(500).send('Failed to download video');

    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
