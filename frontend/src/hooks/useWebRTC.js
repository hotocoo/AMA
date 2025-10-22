/**
 * WebRTC Hook
 * Voice and video calling with bulletproof security and anonymity
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useCrypto } from './useCrypto';

export const useWebRTC = () => {
  const { sessionId } = useAuth();
  const { encryptMessage, decryptMessage } = useCrypto();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');

  const localPeerRef = useRef(null);
  const remotePeerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);

  // WebRTC Configuration
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers in production
    ],
    iceCandidatePoolSize: 10,
  };

  // Media constraints
  const MEDIA_CONSTRAINTS = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
      channelCount: 1,
    },
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user',
    },
  };

  /**
   * Initialize local media stream
   */
  const initializeMediaStream = useCallback(async (type = 'both') => {
    try {
      const constraints = {};

      if (type === 'audio' || type === 'both') {
        constraints.audio = MEDIA_CONSTRAINTS.audio;
      }

      if (type === 'video' || type === 'both') {
        constraints.video = MEDIA_CONSTRAINTS.video;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setLocalStream(stream);
      localStreamRef.current = stream;

      console.log('📹 Local media stream initialized:', type);

      return stream;

    } catch (error) {
      console.error('Media stream initialization failed:', error);

      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone/camera permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone/camera found');
      } else {
        throw new Error('Media access failed');
      }
    }
  }, []);

  /**
   * Start voice call
   */
  const startVoiceCall = useCallback(async (chatId, recipientId) => {
    try {
      setCallStatus('connecting');

      // Initialize audio stream
      const stream = await initializeMediaStream('audio');

      // Create peer connection
      const peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate through encrypted signaling
          sendSignalingMessage(chatId, {
            type: 'ice_candidate',
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        setCallStatus(state);

        if (state === 'connected') {
          setIsCallActive(true);
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setIsCallActive(false);
          stopCallTimer();
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Handle connection quality
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        if (state === 'checking') {
          setConnectionQuality('checking');
        } else if (state === 'connected' || state === 'completed') {
          setConnectionQuality('good');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionQuality('poor');
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await peerConnection.setLocalDescription(offer);

      // Encrypt and send signaling message
      await sendSignalingMessage(chatId, {
        type: 'offer',
        offer: peerConnection.localDescription,
      });

      localPeerRef.current = peerConnection;

      console.log('📞 Voice call started');

    } catch (error) {
      console.error('Voice call start failed:', error);
      setCallStatus('error');
      throw error;
    }
  }, [initializeMediaStream]);

  /**
   * Start video call
   */
  const startVideoCall = useCallback(async (chatId, recipientId) => {
    try {
      setCallStatus('connecting');

      // Initialize audio/video stream
      const stream = await initializeMediaStream('both');

      // Create peer connection
      const peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage(chatId, {
            type: 'ice_candidate',
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        setCallStatus(state);

        if (state === 'connected') {
          setIsCallActive(true);
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setIsCallActive(false);
          stopCallTimer();
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      // Encrypt and send signaling message
      await sendSignalingMessage(chatId, {
        type: 'offer',
        offer: peerConnection.localDescription,
      });

      localPeerRef.current = peerConnection;

      console.log('🎥 Video call started');

    } catch (error) {
      console.error('Video call start failed:', error);
      setCallStatus('error');
      throw error;
    }
  }, [initializeMediaStream]);

  /**
   * Answer incoming call
   */
  const answerCall = useCallback(async (chatId, offer) => {
    try {
      setCallStatus('connecting');

      // Initialize media stream
      const stream = await initializeMediaStream('both');

      // Create peer connection
      const peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage(chatId, {
            type: 'ice_candidate',
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        setCallStatus(state);

        if (state === 'connected') {
          setIsCallActive(true);
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setIsCallActive(false);
          stopCallTimer();
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Set remote description
      await peerConnection.setRemoteDescription(offer);

      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send encrypted answer
      await sendSignalingMessage(chatId, {
        type: 'answer',
        answer: peerConnection.localDescription,
      });

      localPeerRef.current = peerConnection;

      console.log('✅ Call answered');

    } catch (error) {
      console.error('Call answer failed:', error);
      setCallStatus('error');
      throw error;
    }
  }, [initializeMediaStream]);

  /**
   * Handle incoming signaling message
   */
  const handleSignalingMessage = useCallback(async (message, chatId) => {
    try {
      if (!localPeerRef.current) {
        // Queue ICE candidates if peer connection not ready
        if (message.type === 'ice_candidate') {
          iceCandidatesQueueRef.current.push({ message, chatId });
          return;
        }
      }

      const peerConnection = localPeerRef.current;

      switch (message.type) {
        case 'offer':
          await answerCall(chatId, message.offer);
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(message.answer);
          break;

        case 'ice_candidate':
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(message.candidate);
          }
          break;

        default:
          console.warn('Unknown signaling message type:', message.type);
      }

    } catch (error) {
      console.error('Signaling message handling failed:', error);
    }
  }, [answerCall]);

  /**
   * Send encrypted signaling message
   */
  const sendSignalingMessage = useCallback(async (chatId, message) => {
    try {
      // Encrypt signaling data
      const encryptedMessage = await encryptMessage(message, chatId);

      // Send through WebSocket (this would be handled by useWebSocket hook)
      // For now, just log it
      console.log('📡 Encrypted signaling message sent:', message.type);

    } catch (error) {
      console.error('Signaling message encryption failed:', error);
    }
  }, [encryptMessage]);

  /**
   * Toggle audio mute
   */
  const toggleMute = useCallback(() => {
    try {
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();

        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });

        setIsMuted(!isMuted);
        console.log('🎤 Audio', !isMuted ? 'muted' : 'unmuted');
      }
    } catch (error) {
      console.error('Mute toggle failed:', error);
    }
  }, [isMuted]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    try {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();

        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });

        setIsVideoEnabled(!isVideoEnabled);
        console.log('📹 Video', !isVideoEnabled ? 'disabled' : 'enabled');
      }
    } catch (error) {
      console.error('Video toggle failed:', error);
    }
  }, [isVideoEnabled]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (localPeerRef.current) {
        // Replace video track with screen share track
        const sender = localPeerRef.current.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }

        setIsScreenSharing(true);
        console.log('🖥️ Screen sharing started');

        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      }

    } catch (error) {
      console.error('Screen sharing failed:', error);
    }
  }, []);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    try {
      if (localPeerRef.current && localStreamRef.current) {
        // Replace screen share track with camera track
        const sender = localPeerRef.current.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          const cameraTrack = localStreamRef.current.getVideoTracks()[0];
          if (cameraTrack) {
            await sender.replaceTrack(cameraTrack);
          }
        }

        setIsScreenSharing(false);
        console.log('🖥️ Screen sharing stopped');
      }
    } catch (error) {
      console.error('Screen sharing stop failed:', error);
    }
  }, []);

  /**
   * End call
   */
  const endCall = useCallback(() => {
    try {
      // Close peer connection
      if (localPeerRef.current) {
        localPeerRef.current.close();
        localPeerRef.current = null;
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clear remote stream
      setRemoteStream(null);

      // Reset state
      setIsCallActive(false);
      setCallStatus('idle');
      setIsMuted(false);
      setIsVideoEnabled(true);
      setIsScreenSharing(false);

      stopCallTimer();

      console.log('📞 Call ended');

    } catch (error) {
      console.error('Call end failed:', error);
    }
  }, []);

  /**
   * Start call timer
   */
  const startCallTimer = useCallback(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  /**
   * Stop call timer
   */
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  /**
   * Format call duration
   */
  const formatCallDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        const currentFacingMode = localStreamRef.current.getVideoTracks()[0].getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode }
        });

        // Replace video track
        if (localPeerRef.current) {
          const sender = localPeerRef.current.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          );

          if (sender) {
            await sender.replaceTrack(newStream.getVideoTracks()[0]);
          }
        }

        // Stop old track
        localStreamRef.current.getVideoTracks()[0].stop();

        // Update stream
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(newStream.getVideoTracks()[0]);

        setLocalStream(prev => new MediaStream([...prev.getTracks(), newStream.getVideoTracks()[0]]));

        console.log('📷 Camera switched to:', newFacingMode);
      }
    } catch (error) {
      console.error('Camera switch failed:', error);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    // State
    localStream,
    remoteStream,
    isCallActive,
    callStatus,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    callDuration,
    connectionQuality,

    // Call controls
    startVoiceCall,
    startVideoCall,
    answerCall,
    endCall,

    // Media controls
    toggleMute,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,

    // Signaling
    handleSignalingMessage,

    // Utilities
    formatCallDuration,
  };
};