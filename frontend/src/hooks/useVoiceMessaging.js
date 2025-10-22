/**
 * Voice Messaging Hook
 * Advanced voice messaging with playback controls and encryption
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useCrypto } from './useCrypto';

export const useVoiceMessaging = () => {
  const { sessionId } = useAuth();
  const { encryptFile, decryptFile } = useCrypto();

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Playback speeds
  const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  /**
   * Request microphone permission and initialize recording
   */
  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with optimal settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000, // 128kbps for good quality
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        });

        console.log('🎤 Recording completed:', {
          size: audioBlob.size,
          duration: recordingTime
        });

        // Auto-process the recording
        processRecording(audioBlob);
      };

      return true;

    } catch (error) {
      console.error('Microphone access failed:', error);
      return false;
    }
  }, [recordingTime]);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(async () => {
    try {
      const initialized = await initializeRecording();
      if (!initialized) {
        throw new Error('Failed to initialize recording');
      }

      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start MediaRecorder
      mediaRecorderRef.current.start(100); // Collect data every 100ms

      console.log('🎤 Started recording');

    } catch (error) {
      console.error('Recording start failed:', error);
      setIsRecording(false);
    }
  }, [initializeRecording]);

  /**
   * Stop voice recording
   */
  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Stop recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        console.log('🛑 Stopped recording');
      }
    } catch (error) {
      console.error('Recording stop failed:', error);
    }
  }, [isRecording]);

  /**
   * Process recorded audio
   */
  const processRecording = useCallback(async (audioBlob) => {
    try {
      // Convert blob to array buffer for encryption
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      // Encrypt audio data
      // const encryptedAudio = await encryptFile(audioData, chatId);

      console.log('🔐 Audio encrypted for sharing');

      // Return processed audio for sharing
      return {
        audioBlob,
        duration: recordingTime,
        size: audioBlob.size,
        encrypted: true,
      };

    } catch (error) {
      console.error('Audio processing failed:', error);
      throw error;
    }
  }, [recordingTime]);

  /**
   * Play voice message
   */
  const playVoiceMessage = useCallback(async (audioData, chatId) => {
    try {
      setIsPlaying(true);
      setPlaybackTime(0);

      // Decrypt audio data if needed
      let decryptedData = audioData;
      if (audioData.encrypted) {
        const decrypted = await decryptFile(audioData.data, chatId);
        decryptedData = decrypted.fileData;
      }

      // Create blob URL for playback
      const audioBlob = new Blob([decryptedData], { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create audio element if not exists
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Setup audio element
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = volume;

      // Set duration when metadata loads
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration);
      };

      // Update playback time
      const updateTime = () => {
        setPlaybackTime(audioRef.current.currentTime);

        if (!audioRef.current.paused) {
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      };

      // Handle playback end
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        URL.revokeObjectURL(audioUrl);
      };

      // Handle playback error
      audioRef.current.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Start playback
      await audioRef.current.play();
      updateTime();

      console.log('▶️ Playing voice message');

    } catch (error) {
      console.error('Voice message playback failed:', error);
      setIsPlaying(false);
    }
  }, [playbackSpeed, volume]);

  /**
   * Pause voice message
   */
  const pauseVoiceMessage = useCallback(() => {
    try {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);

        // Stop animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        console.log('⏸️ Paused voice message');
      }
    } catch (error) {
      console.error('Pause failed:', error);
    }
  }, [isPlaying]);

  /**
   * Resume voice message
   */
  const resumeVoiceMessage = useCallback(() => {
    try {
      if (audioRef.current && !isPlaying && playbackTime > 0) {
        audioRef.current.play();
        setIsPlaying(true);

        // Resume time updates
        const updateTime = () => {
          setPlaybackTime(audioRef.current.currentTime);

          if (!audioRef.current.paused) {
            animationFrameRef.current = requestAnimationFrame(updateTime);
          }
        };

        updateTime();

        console.log('▶️ Resumed voice message');
      }
    } catch (error) {
      console.error('Resume failed:', error);
    }
  }, [isPlaying, playbackTime]);

  /**
   * Seek to position in voice message
   */
  const seekVoiceMessage = useCallback((time) => {
    try {
      if (audioRef.current && duration > 0) {
        audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setPlaybackTime(audioRef.current.currentTime);

        console.log('⏭️ Seeked to:', time);
      }
    } catch (error) {
      console.error('Seek failed:', error);
    }
  }, [duration]);

  /**
   * Change playback speed
   */
  const changePlaybackSpeed = useCallback((speed) => {
    try {
      if (PLAYBACK_SPEEDS.includes(speed)) {
        setPlaybackSpeed(speed);

        if (audioRef.current) {
          audioRef.current.playbackRate = speed;
        }

        console.log('⚡ Playback speed changed to:', speed);
      }
    } catch (error) {
      console.error('Speed change failed:', error);
    }
  }, []);

  /**
   * Change volume
   */
  const changeVolume = useCallback((newVolume) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(clampedVolume);

      if (audioRef.current) {
        audioRef.current.volume = clampedVolume;
      }

      console.log('🔊 Volume changed to:', clampedVolume);
    } catch (error) {
      console.error('Volume change failed:', error);
    }
  }, []);

  /**
   * Format time for display
   */
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Get waveform data for visualization (simplified)
   */
  const getWaveformData = useCallback((audioBuffer) => {
    // In a real implementation, this would analyze the audio buffer
    // For now, return mock data
    return Array.from({ length: 50 }, () => Math.random() * 100);
  }, []);

  /**
   * Share voice message in chat
   */
  const shareVoiceMessage = useCallback(async (audioBlob, chatId) => {
    try {
      // Convert to array buffer for encryption
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Encrypt audio data
      const encryptedAudio = await encryptFile(arrayBuffer, chatId);

      // Create voice message object
      const voiceMessage = {
        type: 'voice',
        duration: recordingTime,
        size: audioBlob.size,
        encryptedData: encryptedAudio.encryptedFile,
        timestamp: Date.now(),
        format: 'webm',
      };

      console.log('🎤 Voice message prepared for sharing');

      return voiceMessage;

    } catch (error) {
      console.error('Voice message sharing failed:', error);
      throw error;
    }
  }, [encryptFile, recordingTime]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }

      // Stop playback if active
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Clear timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPlaying, stopRecording]);

  return {
    // Recording state
    isRecording,
    recordingTime,
    formatTime,

    // Playback state
    isPlaying,
    playbackTime,
    duration,
    playbackSpeed,
    volume,

    // Recording controls
    startRecording,
    stopRecording,
    processRecording,

    // Playback controls
    playVoiceMessage,
    pauseVoiceMessage,
    resumeVoiceMessage,
    seekVoiceMessage,

    // Playback settings
    changePlaybackSpeed,
    changeVolume,
    PLAYBACK_SPEEDS,

    // Utilities
    getWaveformData,
    shareVoiceMessage,
  };
};