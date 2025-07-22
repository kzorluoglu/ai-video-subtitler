# AI Video Subtitler 🎬🤖

Generate accurate, human-readable subtitles for your videos using OpenAI's Whisper AI model. Fast, free, and runs entirely in your browser.

![AI Video Subtitler Screenshot](./screenshot.png)

## ✨ Features

- **🎯 AI-Powered Transcription** - Uses OpenAI Whisper for accurate speech recognition
- **🌍 Multiple Languages** - Support for English, German, French, Spanish, Italian, Japanese, Chinese, and Russian
- **📱 Browser-Based** - No server required, everything runs locally
- **⚡ Multiple Model Options** - Choose between speed and accuracy (Tiny, Base, Small)
- **📄 SRT Export** - Export subtitles in standard SRT format
- **🎨 Real-time Preview** - See subtitles overlaid on your video as you watch
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🚀 Quick Start

### Online Version
Visit [https://d8devs.com/ai-video-subtitler](https://d8devs.com/ai-video-subtitler) to use the app immediately.

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kzorluoglu/ai-video-subtitler.git
   cd ai-video-subtitler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔧 Building for Production

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

The built files will be in the `dist/` folder, ready for deployment.

## 📦 Deployment Options

### 1. Netlify (Recommended)
- Connect your GitHub repository to Netlify
- Set build command: `npm run build`
- Set publish directory: `dist`
- Deploy automatically on push

### 2. Vercel
- Import your GitHub repository to Vercel
- Framework preset: Vite
- Deploy with one click

### 3. GitHub Pages
- Enable GitHub Pages in repository settings
- Use GitHub Actions for automatic deployment

### 4. Traditional Web Hosting
- Build the project: `npm run build`
- Upload the `dist/` folder contents to your web server

## 🎯 How to Use

1. **Select Video** - Choose a video file from your computer
2. **Choose Model** - Select Whisper model (Tiny for speed, Small for accuracy)
3. **Pick Language** - Choose the spoken language in your video
4. **Generate** - Click "Generate Subtitles" and wait for AI processing
5. **Review** - Watch your video with real-time subtitle overlay
6. **Export** - Download subtitles as SRT file for use in video editors

## 🔧 Technical Details

### Technologies Used
- **Vue.js 3** - Frontend framework
- **Vite** - Build tool and development server
- **@xenova/transformers** - Whisper AI model implementation
- **FFmpeg.wasm** - Audio extraction from video files
- **Web Audio API** - Audio processing and format conversion

### Browser Requirements
- Modern browser with WebAssembly support
- Minimum 4GB RAM (for AI model loading)
- Good internet connection (for initial model download)

### File Support
- **Video Formats**: MP4, MOV, AVI, WebM, MKV
- **Audio Formats**: MP3, WAV, M4A, FLAC
- **Max File Size**: Limited by browser memory (~2GB typical)

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Use Vue 3 Composition API
- Follow ESLint configuration
- Write descriptive commit messages
- Test on multiple browsers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for the Whisper model
- **Hugging Face** for Transformers.js
- **FFmpeg** team for WebAssembly port
- **Vue.js** team for the excellent framework

## 🐛 Issues & Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/ai-video-subtitler/issues) page
2. Create a new issue with:
   - Browser and version
   - Video file format and size
   - Error messages or screenshots
   - Steps to reproduce

## 🚀 Roadmap

- [ ] Batch processing for multiple videos
- [ ] More subtitle formats (VTT, ASS)
- [ ] Custom model training support
- [ ] Subtitle editing interface
- [ ] Video player controls integration
- [ ] Cloud storage integration

---

Made with ❤️ and AI. Star ⭐ if you find this useful!
