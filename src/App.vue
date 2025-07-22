<script setup>
import { ref, onMounted, computed } from 'vue';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { pipeline, env } from '@xenova/transformers';

// Configure transformers
env.allowRemoteModels = true;
env.silent = true;

// State
const videoFile = ref(null);
const videoSrc = ref('');
const videoElement = ref(null);
const subtitles = ref([]);
const isProcessing = ref(false);
const processingStatus = ref('Ready');
const selectedLanguage = ref('en');
const selectedModel = ref('Xenova/whisper-base');
const currentTime = ref(0);

const availableModels = ref([
  { id: 'Xenova/whisper-tiny', name: 'Whisper Tiny (fastest)' },
  { id: 'Xenova/whisper-base', name: 'Whisper Base (balanced)' },
  { id: 'Xenova/whisper-small', name: 'Whisper Small (accurate)' }
]);

const availableLanguages = ref([
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' }
]);

// FFmpeg setup
const ffmpeg = new FFmpeg();
let isFFmpegLoaded = ref(false);

// Try multiple CDN sources for better reliability
const ffmpegCDNs = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.9/dist/esm',
  'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/esm',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
];

onMounted(async () => {
  let loadSuccess = false;
  
  for (const baseURL of ffmpegCDNs) {
    try {
      processingStatus.value = `Loading FFmpeg from ${baseURL.includes('jsdelivr') ? 'jsDelivr' : baseURL.includes('unpkg') ? 'unpkg' : 'CDN'}...`;
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
      });
      
      isFFmpegLoaded.value = true;
      processingStatus.value = 'Ready - FFmpeg loaded successfully';
      loadSuccess = true;
      break;
    } catch (error) {
      console.warn(`Failed to load FFmpeg from ${baseURL}:`, error);
      continue;
    }
  }
  
  if (!loadSuccess) {
    console.error('All FFmpeg CDNs failed');
    processingStatus.value = 'FFmpeg failed to load - using direct audio processing';
    isFFmpegLoaded.value = false;
  }
});

// Read audio properly for Whisper
const readAudioData = async (audioBlob) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0);
    
    if (audioBuffer.sampleRate === 16000) {
      return new Float32Array(audioData);
    } else {
      const ratio = audioBuffer.sampleRate / 16000;
      const newLength = Math.round(audioData.length / ratio);
      const result = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        result[i] = audioData[Math.round(i * ratio)];
      }
      return result;
    }
  } finally {
    if (audioContext.state !== 'closed') await audioContext.close();
  }
};

// Handle file selection
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  videoFile.value = file;
  videoSrc.value = URL.createObjectURL(file);
  subtitles.value = [];
};

// Process video
const processVideo = async () => {
  if (!videoFile.value) return;
  
  try {
    isProcessing.value = true;
    subtitles.value = [];
    
    let audioBlob;
    
    if (isFFmpegLoaded.value) {
      try {
        // Extract audio using FFmpeg
        processingStatus.value = 'Extracting audio with FFmpeg...';
        await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile.value));
        await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-ar', '16000', '-ac', '1', '-f', 'wav', 'output.wav']);
        const data = await ffmpeg.readFile('output.wav');
        audioBlob = new Blob([data.buffer], { type: 'audio/wav' });
      } catch (ffmpegError) {
        console.warn('FFmpeg processing failed, using direct processing:', ffmpegError);
        processingStatus.value = 'FFmpeg failed, using direct audio processing...';
        audioBlob = videoFile.value;
      }
    } else {
      // Use video file directly (browsers can extract audio)
      processingStatus.value = 'Using direct audio processing...';
      audioBlob = videoFile.value;
    }
    
    // Convert audio for Whisper
    processingStatus.value = 'Converting audio for AI processing...';
    const audioData = await readAudioData(audioBlob);
    
    // Transcribe
    processingStatus.value = 'AI is transcribing your video (this may take a minute)...';
    const transcriber = await pipeline('automatic-speech-recognition', selectedModel.value);
    const result = await transcriber(audioData, {
      chunk_length_s: 30,  // Longer chunks for natural speech
      stride_length_s: 5,
      return_timestamps: true,
      language: 'english',
      task: 'transcribe'
    });
    
    // Create human-readable subtitles
    let finalSubtitles = [];
    
    if (result.chunks && result.chunks.length > 0) {
      // Combine short chunks into readable segments
      let currentText = '';
      let currentStart = null;
      let currentEnd = null;
      
      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];
        const text = chunk.text.trim();
        
        if (currentStart === null) {
          currentStart = chunk.timestamp[0];
          currentText = text;
          currentEnd = chunk.timestamp[1];
        } else {
          // Add to current subtitle if it's a continuation
          currentText += ' ' + text;
          currentEnd = chunk.timestamp[1];
        }
        
        // Create subtitle when we hit natural breaks or max length
        const shouldBreak = 
          text.match(/[.!?]$/) ||  // Sentence ending
          currentText.length > 100 || // Too long
          (i === result.chunks.length - 1) || // Last chunk
          (chunk.timestamp[1] - currentStart > 6); // Too long duration
        
        if (shouldBreak) {
          finalSubtitles.push({
            start: currentStart,
            end: currentEnd,
            text: currentText.trim()
          });
          currentStart = null;
          currentText = '';
          currentEnd = null;
        }
      }
    } else if (result.text) {
      // Split by natural sentence boundaries
      const text = result.text.trim();
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const duration = audioData.length / 16000;
      
      if (sentences.length > 1) {
        let currentTime = 0;
        sentences.forEach((sentence, i) => {
          // Estimate timing based on sentence length relative to total text
          const sentenceRatio = sentence.length / text.length;
          const sentenceDuration = Math.max(2, duration * sentenceRatio); // Min 2 seconds
          
          finalSubtitles.push({
            start: currentTime,
            end: currentTime + sentenceDuration,
            text: sentence.trim()
          });
          
          currentTime += sentenceDuration;
        });
      } else {
        // Single long text - split into readable chunks
        const words = text.split(' ');
        const wordsPerChunk = 12; // ~12 words per subtitle for readability
        const timePerWord = duration / words.length;
        
        for (let i = 0; i < words.length; i += wordsPerChunk) {
          const chunkWords = words.slice(i, i + wordsPerChunk);
          const startTime = i * timePerWord;
          const endTime = Math.min((i + wordsPerChunk) * timePerWord, duration);
          
          finalSubtitles.push({
            start: startTime,
            end: endTime,
            text: chunkWords.join(' ')
          });
        }
      }
    }
    
    // Clean up and validate subtitles
    subtitles.value = finalSubtitles
      .filter(sub => sub.text.length > 3) // Remove very short text
      .map(sub => ({
        ...sub,
        text: sub.text.replace(/\s+/g, ' ').trim() // Clean whitespace
      }));
    
    const statusMessage = isFFmpegLoaded.value 
      ? `Generated ${subtitles.value.length} readable subtitles with FFmpeg`
      : `Generated ${subtitles.value.length} readable subtitles (direct processing)`;
    processingStatus.value = statusMessage;
    
  } catch (error) {
    console.error('Processing error:', error);
    processingStatus.value = `Error: ${error.message}`;
  } finally {
    isProcessing.value = false;
  }
};

// Update current time
const updateCurrentTime = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime;
  }
};

// Current subtitle
const currentSubtitle = computed(() => {
  return subtitles.value.find(sub => 
    currentTime.value >= sub.start && currentTime.value <= sub.end
  );
});

// Format time
const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Export SRT
const exportSubtitles = () => {
  let srt = '';
  subtitles.value.forEach((sub, i) => {
    const startTime = formatSrtTime(sub.start);
    const endTime = formatSrtTime(sub.end);
    srt += `${i + 1}\n${startTime} --> ${endTime}\n${sub.text}\n\n`;
  });
  
  const blob = new Blob([srt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subtitles.srt';
  a.click();
  URL.revokeObjectURL(url);
};

const formatSrtTime = (timeInSeconds) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const ms = Math.floor((timeInSeconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

// Jump to subtitle
const jumpToSubtitle = (startTime) => {
  if (videoElement.value) {
    videoElement.value.currentTime = startTime;
  }
};
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <h1>🎬 AI Video Subtitler</h1>
      <p>Generate accurate subtitles using AI</p>
    </header>

    <!-- Top toolbar -->
    <div class="toolbar">
      <label class="file-input-label">
        <input type="file" accept="video/*" @change="handleFileChange" />
        📁 Select Video
      </label>
      
      <select v-model="selectedModel" class="select">
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name }}
        </option>
      </select>
      
      <select v-model="selectedLanguage" class="select">
        <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
          {{ lang.name }}
        </option>
      </select>
      
      <button @click="processVideo" :disabled="!videoFile || isProcessing" class="btn-primary">
        {{ isProcessing ? 'Processing...' : 'Generate Subtitles' }}
      </button>
      
      <button @click="exportSubtitles" :disabled="subtitles.length === 0" class="btn-secondary">
        📥 Export SRT
      </button>
      
      <div class="status">{{ processingStatus }}</div>
    </div>

    <!-- Main content -->
    <div class="main-content">
      <!-- Video side -->
      <div class="video-side">
        <div v-if="videoSrc" class="video-container">
          <video 
            ref="videoElement" 
            :src="videoSrc" 
            controls 
            @timeupdate="updateCurrentTime"
            class="video"
          ></video>
          
          <!-- Current subtitle overlay -->
          <div v-if="currentSubtitle" class="subtitle-overlay">
            {{ currentSubtitle.text }}
          </div>
        </div>
        <div v-else class="video-placeholder">
          Select a video file to get started
        </div>
      </div>

      <!-- Subtitles side -->
      <div class="subtitles-side">
        <h3>Subtitles ({{ subtitles.length }})</h3>
        <div class="subtitles-list">
          <div 
            v-for="(subtitle, index) in subtitles" 
            :key="index"
            :class="['subtitle-item', { active: currentSubtitle === subtitle }]"
            @click="jumpToSubtitle(subtitle.start)"
          >
            <div class="subtitle-time">
              {{ formatTime(subtitle.start) }} - {{ formatTime(subtitle.end) }}
            </div>
            <div class="subtitle-text">{{ subtitle.text }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  background: #f9f9f9;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: white;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.file-input-label {
  position: relative;
  background: #1976d2;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.file-input-label input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.status {
  margin-left: auto;
  font-size: 14px;
  color: #666;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.video-side {
  flex: 1;
  padding: 20px;
  background: #000;
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.video-placeholder {
  color: #666;
  font-size: 18px;
  text-align: center;
  background: #f5f5f5;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.subtitle-overlay {
  position: absolute;
  bottom: 60px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  text-align: center;
  font-size: 16px;
  line-height: 1.4;
}

.subtitles-side {
  width: 400px;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.subtitles-side h3 {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 16px;
  color: #333;
}

.subtitles-list {
  flex: 1;
  overflow-y: auto;
}

.subtitle-item {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.subtitle-item:hover {
  background: #f5f5f5;
}

.subtitle-item.active {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.subtitle-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.subtitle-text {
  font-size: 14px;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .subtitles-side {
    width: 100%;
    height: 300px;
  }
  
  .toolbar {
    padding: 8px 12px;
    gap: 8px;
  }
  
  .toolbar .select,
  .toolbar .btn-primary,
  .toolbar .btn-secondary {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>
