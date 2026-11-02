import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera,
  faCameraRotate,
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faPhoneSlash,
  faShare,
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
  const finished = ['ended', 'missed', 'rejected', 'offline'].includes(call?.status)

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call?.localStream ?? null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call?.remoteStream ?? null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = call?.remoteStream ?? null
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
    <div className='call-overlay-backdrop'>
      <section className={`call-overlay${call.kind === 'video' ? ' is-video' : ''}`} role='dialog' aria-modal='true' aria-label={`${call.kind} call`}>
        {call.kind === 'video' && call.status !== 'incoming' && (
          <div className='call-video-stage'>
            <video ref={remoteVideoRef} autoPlay playsInline aria-label='Remote video' />
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
