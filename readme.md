# YouTube Video Downloader

Welcome to the YouTube Video Downloader! This application allows you to download YouTube videos and audio directly from the web.

**Live Demo:** [YouTube Video Downloader](https://yt-downloader-brbx.onrender.com)

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Features

- Download YouTube videos in various formats.
- Download audio-only versions of YouTube videos.
- Responsive design for mobile users.
- User-friendly interface with download buttons.
- Server-side processing to handle YouTube video fetching and streaming.

## Technologies

- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, JavaScript
- **Video Processing:** ffmpeg-static, fluent-ffmpeg, ytdl-core
- **Hosting:** Render.com

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/khadkaankit85/yt-downloader.git
   cd yt-downloader
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

   The server will run at `http://localhost:4000`.

## Usage

1. **Open the application:**

   Go to [YouTube Video Downloader](https://yt-downloader-brbx.onrender.com).

2. **Enter the URL of the YouTube video:**

   Copy and paste the YouTube video URL into the input box.

3. **Select download type:**

   Choose whether you want to download the video or just the audio.

4. **Click the download button:**

   Click the respective download button to start the download.

## API Endpoints

- **GET /watch?v=VIDEO_ID**

  Fetches the available download links for the specified YouTube video.

- **POST /download**

  Downloads the video or audio based on the provided link and type.

  - Request Body:

    ```json
    {
      "downloadLink": "URL_TO_DOWNLOAD",
      "type": "Video or Audio"
    }
    ```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
