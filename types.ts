
export interface TTSConfig {
  voice: string;
  speed: number;
  volume: number;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  currentWordIndex: number;
}

export interface HighlightedTextProps {
  text: string;
  currentIndex: number;
  isPlaying: boolean;
}
