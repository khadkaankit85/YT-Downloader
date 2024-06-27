const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require("fs")
const ffmpegPath = require('ffmpeg-static');
console.log('ffmpeg path is :', ffmpegPath);
ffmpeg.setFfmpegPath(path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg"));

const app = express();
const port = process.env.PORT || 4000;

// Set the path to the ffmpeg binary



app.use(express.static(path.join(__dirname, "Public")))



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




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
