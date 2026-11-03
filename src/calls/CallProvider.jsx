import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../api'
import { useRealtime } from '../realtime/useRealtime'
import CallContext from './context'

function stopTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function CallProvider({ children }) {
  const { socket } = useRealtime()
  const [call, setCall] = useState(null)
  const [error, setError] = useState('')
  const callRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const iceServersRef = useRef([])
  const pendingSignalsRef = useRef([])
  const screenTrackRef = useRef(null)
  const finishTimerRef = useRef(null)
  const pendingAcceptedRef = useRef(null)
  const acceptedHandlerRef = useRef(null)

  const updateCall = useCallback((update) => {
    const nextCall = typeof update === 'function' ? update(callRef.current) : update
    callRef.current = nextCall
    setCall(nextCall)
  }, [])

  const releaseMedia = useCallback(() => {
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    stopTracks(localStreamRef.current)
    stopTracks(remoteStreamRef.current)
    stopTracks(screenTrackRef.current ? new MediaStream([screenTrackRef.current]) : null)
    localStreamRef.current = null
    remoteStreamRef.current = null
    screenTrackRef.current = null
    pendingSignalsRef.current = []
  }, [])

  const closeCall = useCallback((nextCall = null) => {
    window.clearTimeout(finishTimerRef.current)
    releaseMedia()
    updateCall(nextCall)
  }, [releaseMedia, updateCall])

  const sendSignal = useCallback((signal) => {
    const activeCall = callRef.current
    if (!socket?.connected || !activeCall?.callId || !activeCall.peerId) return
    socket.emit('webrtc:signal', {
      callId: activeCall.callId,
      peerId: activeCall.peerId,
      ...signal,
    })
  }, [socket])

  const receiveSignal = useCallback(async (signal) => {
    const activeCall = callRef.current
    if (!peerConnectionRef.current || activeCall?.callId !== signal.callId) {
      pendingSignalsRef.current.push(signal)
      return
    }

    const peer = peerConnectionRef.current
    if (signal.type === 'ice') {
      if (!peer.remoteDescription) {
        pendingSignalsRef.current.push(signal)
        return
      }
      await peer.addIceCandidate(signal.candidate)
      return
    }
    if (signal.type === 'offer') {
      await peer.setRemoteDescription(signal.description)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendSignal({ type: 'answer', description: peer.localDescription })
      const queued = pendingSignalsRef.current.splice(0)
      for (const queuedSignal of queued) await receiveSignal(queuedSignal)
      return
    }
    if (signal.type === 'answer') {
      await peer.setRemoteDescription(signal.description)
      const queued = pendingSignalsRef.current.splice(0)
      for (const queuedSignal of queued) await receiveSignal(queuedSignal)
    }
  }, [sendSignal])

  const setupPeerConnection = useCallback(async ({ callId, peerId, kind, initiator }) => {
    if (peerConnectionRef.current) return
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current })
    peerConnectionRef.current = peer
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ type: 'ice', candidate: event.candidate.toJSON() })
    }
    peer.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0] ?? new MediaStream([event.track])
      updateCall((current) => current ? { ...current, remoteStream: remoteStreamRef.current } : current)
    }
    peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(peer.connectionState)) {
        updateCall((current) => current
          ? { ...current, connectionState: peer.connectionState }
          : current)
      }
    }

    updateCall((current) => current
      ? { ...current, callId, peerId, kind, status: 'connecting', connectionState: 'connecting' }
      : current)

    if (initiator) {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendSignal({ type: 'offer', description: peer.localDescription })
    }
    const queued = pendingSignalsRef.current.splice(0)
    for (const signal of queued) await receiveSignal(signal)
  }, [receiveSignal, sendSignal, updateCall])

  useEffect(() => {
    if (!socket) return undefined

    const handleIncoming = ({ callId, caller, kind, startedAt }) => {
      if (callRef.current) {
        socket.emit('call:reject', { callId }, () => {})
        return
      }
      setError('')
      updateCall({
        callId,
        peerId: caller.id,
        peer: caller,
        kind,
        status: 'incoming',
        startedAt,
        muted: false,
        cameraEnabled: true,
        sharingScreen: false,
      })
    }
    const handleAccepted = (acceptedCall) => {
      const current = callRef.current
      if (!current) return
      if (!current.callId) {
        if (current.status === 'outgoing' && current.peerId === acceptedCall.peerId) {
          pendingAcceptedRef.current = acceptedCall
        }
        return
      }
      if (current.callId !== acceptedCall.callId) return
      updateCall((current) => ({
        ...current,
        peerId: acceptedCall.peerId,
        kind: acceptedCall.kind,
        status: 'connecting',
        answeredAt: acceptedCall.answeredAt,
      }))
      setupPeerConnection(acceptedCall).catch((requestError) => {
        setError(requestError.message || 'The call connection could not be established')
        socket.emit('call:end', { callId: acceptedCall.callId })
      })
    }
    acceptedHandlerRef.current = handleAccepted
    const handleFinished = (finishedCall) => {
      if (callRef.current?.callId !== finishedCall.callId) return
      const current = callRef.current
      releaseMedia()
      updateCall({
        ...current,
        status: finishedCall.reason,
        endedAt: finishedCall.endedAt,
        localStream: null,
        remoteStream: null,
      })
      finishTimerRef.current = window.setTimeout(() => closeCall(), 4000)
    }
    const handleSignal = (signal) => {
      receiveSignal(signal).catch((requestError) => {
        setError(requestError.message || 'Call signaling failed')
        socket.emit('call:end', { callId: signal.callId })
      })
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:accepted', handleAccepted)
    socket.on('call:finished', handleFinished)
    socket.on('webrtc:signal', handleSignal)
    return () => {
      acceptedHandlerRef.current = null
      socket.off('call:incoming', handleIncoming)
      socket.off('call:accepted', handleAccepted)
      socket.off('call:finished', handleFinished)
      socket.off('webrtc:signal', handleSignal)
    }
  }, [closeCall, receiveSignal, releaseMedia, setupPeerConnection, socket, updateCall])

  useEffect(() => () => {
    window.clearTimeout(finishTimerRef.current)
    releaseMedia()
  }, [releaseMedia])

  const startCall = useCallback(async (peer, kind) => {
    if (!peer || !peer.id) throw new Error('Select a valid friend before starting a call')
    if (!socket?.connected) throw new Error('The call service is not connected')
    if (callRef.current) throw new Error('End your current call before starting another')
    if (!['audio', 'video'].includes(kind)) throw new Error('Choose an audio or video call')
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Audio and video calls require a supported browser and secure connection')
    }
    setError('')
    updateCall({
      peer,
      peerId: peer.id,
      kind,
      status: 'starting',
      muted: false,
      cameraEnabled: true,
      sharingScreen: false,
    })
    try {
      const { iceServers } = await apiRequest('/calls/ice-servers')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video' ? { facingMode: 'user' } : false,
      })
      iceServersRef.current = iceServers
      localStreamRef.current = stream
      updateCall((current) => current ? { ...current, localStream: stream, status: 'outgoing' } : current)
      const response = await new Promise((resolve, reject) => {
        socket.timeout(10000).emit('call:start', { recipientId: peer.id, kind }, (timeoutError, result) => {
          if (timeoutError) reject(new Error('The call request timed out'))
          else if (result?.error) reject(new Error(result.error))
          else resolve(result)
        })
      })
      if (response.status === 'missed') {
        updateCall((current) => ({
          ...current,
          callId: response.callId,
          status: 'missed',
          endedAt: new Date().toISOString(),
          localStream: null,
          remoteStream: null,
        }))
        releaseMedia()
        finishTimerRef.current = window.setTimeout(() => closeCall(), 4000)
        return
      }
      updateCall((current) => ({ ...current, callId: response.callId }))
      if (pendingAcceptedRef.current?.callId === response.callId) {
        const acceptedCall = pendingAcceptedRef.current
        pendingAcceptedRef.current = null
        acceptedHandlerRef.current?.(acceptedCall)
      }
    } catch (requestError) {
      closeCall()
      throw requestError
    }
  }, [closeCall, releaseMedia, socket, updateCall])

  const acceptCall = useCallback(async () => {
    const activeCall = callRef.current
    if (activeCall?.status !== 'incoming' || !socket?.connected) return
    setError('')
    try {
      const { iceServers } = await apiRequest('/calls/ice-servers')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.kind === 'video' ? { facingMode: 'user' } : false,
      })
      iceServersRef.current = iceServers
      localStreamRef.current = stream
      updateCall((current) => current ? { ...current, localStream: stream, status: 'connecting' } : current)
      socket.timeout(10000).emit('call:accept', { callId: activeCall.callId }, (timeoutError, result) => {
        if (timeoutError || result?.error) {
          setError(result?.error || 'The call could not be accepted')
          socket.emit('call:end', { callId: activeCall.callId })
          closeCall()
        }
      })
    } catch (requestError) {
      setError(requestError.message || 'Microphone or camera access was denied')
      socket.emit('call:reject', { callId: activeCall.callId }, () => {})
      closeCall()
    }
  }, [closeCall, socket, updateCall])

  const rejectCall = useCallback(() => {
    const activeCall = callRef.current
    if (!activeCall?.callId) return
    socket?.emit('call:reject', { callId: activeCall.callId }, () => {})
    closeCall()
  }, [closeCall, socket])

  const endCall = useCallback(() => {
    const activeCall = callRef.current
    if (!activeCall) return
    if (activeCall.callId) socket?.emit('call:end', { callId: activeCall.callId })
    closeCall()
  }, [closeCall, socket])

  const toggleMicrophone = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? []
    if (!tracks.length) return
    tracks.forEach((track) => { track.enabled = !track.enabled })
    updateCall((current) => current ? { ...current, muted: !tracks[0].enabled } : current)
  }, [updateCall])

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? []
    if (!tracks.length) return
    tracks.forEach((track) => { track.enabled = !track.enabled })
    updateCall((current) => current ? { ...current, cameraEnabled: tracks[0].enabled } : current)
  }, [updateCall])

  const shareScreen = useCallback(async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
      return
    }
    if (!localStreamRef.current || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen sharing is not supported by this browser')
    }
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = screenStream.getVideoTracks()[0]
    const sender = peerConnectionRef.current?.getSenders().find((item) => item.track?.kind === 'video')
    if (!screenTrack || !sender) {
      stopTracks(screenStream)
      throw new Error('Screen sharing requires an active video call')
    }
    const cameraTrack = localStreamRef.current.getVideoTracks()[0]
    await sender.replaceTrack(screenTrack)
    screenTrackRef.current = screenTrack
    screenTrack.onended = async () => {
      if (cameraTrack) await sender.replaceTrack(cameraTrack)
      screenTrackRef.current = null
      updateCall((current) => current ? { ...current, localStream: localStreamRef.current, sharingScreen: false } : current)
    }
    const screenMediaStream = new MediaStream([
      ...localStreamRef.current.getAudioTracks(),
      screenTrack,
    ])
    updateCall((current) => current
      ? { ...current, localStream: screenMediaStream, sharingScreen: true }
      : current)
  }, [updateCall])

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return
    const oldTrack = localStreamRef.current.getVideoTracks()[0]
    if (!oldTrack) return
    const nextFacing = callRef.current?.facingMode === 'environment' ? 'user' : 'environment'
    const nextStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: nextFacing } },
      audio: false,
    })
    const nextTrack = nextStream.getVideoTracks()[0]
    const sender = peerConnectionRef.current.getSenders().find((item) => item.track?.kind === 'video')
    if (!nextTrack || !sender) {
      stopTracks(nextStream)
      return
    }
    await sender.replaceTrack(nextTrack)
    localStreamRef.current.removeTrack(oldTrack)
    localStreamRef.current.addTrack(nextTrack)
    oldTrack.stop()
    updateCall((current) => current
      ? { ...current, localStream: localStreamRef.current, facingMode: nextFacing }
      : current)
  }, [updateCall])

  const value = useMemo(() => ({
    call,
    error,
    setError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    shareScreen,
    switchCamera,
  }), [
    acceptCall,
    call,
    endCall,
    error,
    rejectCall,
    setError,
    shareScreen,
    startCall,
    switchCamera,
    toggleCamera,
    toggleMicrophone,
  ])
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}
