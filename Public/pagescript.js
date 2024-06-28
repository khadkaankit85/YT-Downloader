const getVideoBtn = document.getElementById("download-video")
const videoUrlBox = document.getElementById("video-url")
const downloadButtonSection = document.getElementById("downloadButtonSection")

function extractVideoId(url) {
    // Regular expression to match YouTube video ID
    const pattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    // Extract video ID using regex
    const match = url.match(pattern);

    // If match is found, return the video ID; otherwise, return null
    return match ? match[1] : null;
}

// Assume 'videoUrl' is the URL received from the server

// Function to trigger download
async function triggerDownload(title, downloadLink, type) {
    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'audio/mp3, audio/mpeg, video/mp4' // Specify accepted media types
            },
            body: JSON.stringify({ downloadLink, type })
        });

        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Create a temporary link element
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = type === 'Video' ? `${title}.mp4` : `${title}.mp3`; // Set desired file name here
            document.body.appendChild(link);

            // Trigger the download
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } else {
            throw new Error('Failed to download');
        }
    } catch (error) {
        console.error('Error downloading video:', error);
    }
}


getVideoBtn.addEventListener("click", async (e) => {
    const videoUrl = videoUrlBox.value
    videoUrlBox.innerText = ""

    const videoID = extractVideoId(videoUrl)

    if (!videoUrl || !videoID || videoID == null) {
        return
    }
    const response = await fetch(`/watch?v=${videoID}`)
    console.log(response)

    try {
        const data = await response.json()
        const videoLinks = data.videoDownloadLinks
        const audioLinks = data.audioDownloadLinks

        const createDownloadButton = (link, type) => {
            const btn = document.createElement("button");
            btn.textContent = `Download ${type}(${link.quality})`;
            console.log(link)
            btn.addEventListener("click", async () => {
                try {
                    // const downloadResponse = await fetch('/download', {
                    //     method: 'POST',
                    //     headers: {
                    //         'Content-Type': 'application/json'
                    //     },
                    //     body: JSON.stringify({ downloadLink: link, type: type })
                    // });
                    // if (!downloadResponse.ok) {
                    //     throw new Error('Failed to download');
                    // }
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.disabled = false
                    }, 10000)
                    console.log("trying to download a ", type)
                    triggerDownload(data.title, link.url, type)
                }
                catch (e) {
                    console.log("error downloading content ", e)
                }
            })
            downloadButtonSection.appendChild(btn);

        }


        // Clear existing buttons (if any)
        const downloadButtonSection = document.getElementById("downloadButtonSection");
        downloadButtonSection.innerHTML = '';

        // Create buttons for video links
        videoLinks.map((link) => {
            return createDownloadButton(link, "Video");
        });

        // Create buttons for audio links
        audioLinks.map((link) => {
            return createDownloadButton(link, "Audio");
        });


    }
    catch (e) {
        // console.log(e)
    }
})
