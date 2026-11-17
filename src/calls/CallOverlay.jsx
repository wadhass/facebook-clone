import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera,
  faCameraRotate,
  faCompress,
  faExpand,
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faPhoneSlash,
  faShare,
  faVolumeHigh,
  faVolumeLow,
} from '@fortawesome/free-solid-svg-icons'
import { getMediaUrl } from '../api'
import { useCalls } from './useCalls'
import './calls.css'

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export default function CallOverlay() {
  const {
    call,
    error,
    setError,
    acceptCall,
    rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    shareScreen,
    switchCamera,
  } = useCalls()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [compact, setCompact] = useState(false)
  const [audioOutputId, setAudioOutputId] = useState('')
  const finished = ['ended', 'missed', 'rejected', 'offline'].includes(call?.status)

  useEffect(() => {
    setCompact(false)
  }, [call?.callId])

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call?.localStream ?? null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call?.remoteStream ?? null
    if (!remoteAudioRef.current) return
    remoteAudioRef.current.srcObject = call?.remoteStream ?? null
    if (call?.remoteStream) {
      remoteAudioRef.current.play().catch(() => {
        setAudioBlocked(true)
      })
    } else {
      setAudioBlocked(false)
    }
  }, [call?.localStream, call?.remoteStream])

  useEffect(() => {
    setDuration(0)
    if (!call?.answeredAt || finished) return undefined
    const updateDuration = () => {
      setDuration(Math.max(0, Math.floor((Date.now() - new Date(call.answeredAt)) / 1000)))
    }
    updateDuration()
    const intervalId = window.setInterval(updateDuration, 1000)
    return () => window.clearInterval(intervalId)
  }, [call?.answeredAt, finished])

  if (!call && !error) return null

  async function perform(action) {
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function enableCallAudio() {
    try {
      await remoteAudioRef.current?.play()
      setAudioBlocked(false)
    } catch (playError) {
      setError(playError.message || 'Call audio could not be started')
    }
  }

  async function toggleAudioOutput() {
    const audio = remoteAudioRef.current
    if (!audio || typeof audio.setSinkId !== 'function') {
      throw new Error('This browser does not support audio output selection. Use your device audio controls instead.')
    }

    if (audioOutputId) {
      await audio.setSinkId('default')
      setAudioOutputId('')
      return
    }

    if (typeof navigator.mediaDevices?.selectAudioOutput !== 'function') {
      throw new Error('This browser does not offer an audio output picker. Use your device audio controls instead.')
    }

    const output = await navigator.mediaDevices.selectAudioOutput()
    await audio.setSinkId(output.deviceId)
    setAudioOutputId(output.deviceId)
  }

  if (!call) {
    return (
      <div className='call-error-toast' role='alert'>
        <span>{error}</span>
        <button type='button' onClick={() => setError('')} aria-label='Dismiss call error'>×</button>
      </div>
    )
  }

  const statusText = call.status === 'incoming'
    ? `Incoming ${call.kind} call`
    : call.status === 'outgoing'
      ? 'Calling…'
      : call.status === 'starting'
        ? 'Preparing your call…'
        : call.status === 'missed'
          ? 'Call not answered'
          : call.status === 'rejected'
            ? 'Call declined'
            : finished
              ? 'Call ended'
              : call.connectionState === 'failed'
                ? 'Connection failed'
                : call.remoteStream
                  ? formatDuration(duration)
                  : 'Connecting…'

  return (
    <div className={`call-overlay-backdrop${compact ? ' is-compact' : ''}`}>
      <section
        className={`call-overlay${call.kind === 'video' ? ' is-video' : ''}${compact ? ' is-compact' : ''}`}
        role='dialog'
        aria-modal={!compact}
        aria-label={`${call.kind} call`}
      >
        <div className='call-topbar'>
          {call.kind === 'audio' ? (
            <button
              type='button'
              className='call-top-button'
              onClick={() => setCompact((current) => !current)}
              aria-label={compact ? 'Expand call' : 'Minimize call'}
              title={compact ? 'Expand call' : 'Minimize call'}
            >
              <FontAwesomeIcon icon={compact ? faExpand : faCompress} />
            </button>
          ) : (
            <button type='button' className='call-top-button' aria-label='Back'>‹</button>
          )}
          <span className='call-status-pill'>{call.kind === 'video' ? 'Video' : 'Voice'}</span>
          {call.kind === 'audio' ? (
            <button
              type='button'
              className='call-top-button'
              onClick={() => perform(toggleAudioOutput)}
              aria-label={audioOutputId ? 'Use default audio output' : 'Choose audio output'}
              title={audioOutputId ? 'Use default audio output' : 'Choose audio output'}
            >
              <FontAwesomeIcon icon={audioOutputId ? faVolumeHigh : faVolumeLow} />
            </button>
          ) : (
            <button type='button' className='call-top-button call-top-button--camera' aria-label='Camera options'>◉</button>
          )}
        </div>

        {call.kind === 'video' && call.status !== 'incoming' && (
          <div className='call-video-stage'>
            <video ref={remoteVideoRef} autoPlay playsInline muted aria-label='Remote video' />
            <video ref={localVideoRef} autoPlay playsInline muted aria-label='Your video' />
            <audio ref={remoteAudioRef} autoPlay playsInline />
          </div>
        )}
        {call.kind === 'audio' && <audio ref={remoteAudioRef} autoPlay playsInline />}
        {(call.status === 'incoming' || call.kind === 'audio' || finished) && (
          <div className='call-avatar'>
            {call.peer?.avatar
              ? <img src={getMediaUrl(call.peer.avatar)} alt='' />
              : <span>{call.peer?.name?.[0] ?? '?'}</span>}
          </div>
        )}
        <div className='call-details'>
          <h2>{call.peer?.name ?? 'Qavero member'}</h2>
          <p>{statusText}</p>
        </div>
        {error && <p className='call-inline-error' role='alert'>{error}</p>}
        {audioBlocked && call.remoteStream && (
          <button type='button' className='call-audio-enable' onClick={enableCallAudio}>
            Tap to hear your friend
          </button>
        )}

        {call.status === 'incoming' ? (
          <div className='call-actions'>
            <button type='button' className='call-action call-action--decline' onClick={rejectCall}>
              <FontAwesomeIcon icon={faPhoneSlash} />
              <span>Decline</span>
            </button>
            <button type='button' className='call-action call-action--accept' onClick={() => perform(acceptCall)}>
              <FontAwesomeIcon icon={faPhone} />
              <span>Accept</span>
            </button>
          </div>
        ) : !finished && (
          <div className='call-actions'>
            <button type='button' className={`call-action${call.muted ? ' is-active' : ''}`} onClick={toggleMicrophone}>
              <FontAwesomeIcon icon={call.muted ? faMicrophoneSlash : faMicrophone} />
              <span>{call.muted ? 'Unmute' : 'Mute'}</span>
            </button>
            {call.kind === 'video' && (
              <>
                <button
                  type='button'
                  className={`call-action${!call.cameraEnabled ? ' is-active' : ''}`}
                  onClick={toggleCamera}
                  disabled={call.sharingScreen}
                >
                  <FontAwesomeIcon icon={faCamera} />
                  <span>{call.cameraEnabled ? 'Camera off' : 'Camera on'}</span>
                </button>
                <button
                  type='button'
                  className={`call-action${call.sharingScreen ? ' is-active' : ''}`}
                  onClick={() => perform(shareScreen)}
                >
                  <FontAwesomeIcon icon={faShare} />
                  <span>{call.sharingScreen ? 'Stop sharing' : 'Share screen'}</span>
                </button>
                <button
                  type='button'
                  className='call-action'
                  onClick={() => perform(switchCamera)}
                  disabled={call.sharingScreen}
                  aria-label='Switch camera'
                >
                  <FontAwesomeIcon icon={faCameraRotate} />
                  <span>Flip</span>
                </button>
              </>
            )}
            <button type='button' className='call-action call-action--decline' onClick={endCall}>
              <FontAwesomeIcon icon={faPhoneSlash} />
              <span>End</span>
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
