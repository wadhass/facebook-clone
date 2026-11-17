import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faComments,
  faEye,
  faMicrophone,
  faMicrophoneSlash,
  faPhoneSlash,
  faVideo,
  faVideoSlash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'
import { usePreferences } from '../../preferences/usePreferences'
import './live.css'

const chatTopic = 'qavero-live-chat'
const maxChatLength = 500

export default function Live() {
  const { user } = useAuth()
  const { lowData, t } = usePreferences()
  const [streams, setStreams] = useState([])
  const [activeStream, setActiveStream] = useState(null)
  const [videoTrack, setVideoTrack] = useState(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('')
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const roomRef = useRef(null)
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const audioContainerRef = useRef(null)
  const heartbeatRef = useRef(null)
  const endingRef = useRef(false)

  const loadStreams = useCallback(async () => {
    try {
      const { streams: liveStreams } = await apiRequest('/live')
      setStreams(liveStreams)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStreams()
    const intervalId = window.setInterval(loadStreams, 15000)
    return () => window.clearInterval(intervalId)
  }, [loadStreams])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoTrack || !videoElement) return undefined

    videoTrack.attach(videoElement)
    return () => videoTrack.detach(videoElement)
  }, [videoTrack])

  useEffect(() => {
    const room = roomRef.current
    if (!room) return undefined

    let cancelled = false
    import('livekit-client')
      .then(({ VideoQuality }) => {
        if (cancelled || roomRef.current !== room) return
        const quality = lowData ? VideoQuality.LOW : VideoQuality.HIGH
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (publication.kind === 'video') publication.setVideoQuality(quality)
          }
        }
        for (const publication of room.localParticipant.trackPublications.values()) {
          if (publication.kind === 'video' && typeof publication.track?.setPublishingQuality === 'function') {
            publication.track.setPublishingQuality(quality)
          }
        }
      })
      .catch((qualityError) => {
        if (!cancelled) setError(qualityError.message || 'Could not adjust live video quality')
      })

    return () => {
      cancelled = true
    }
  }, [activeStream, lowData])

  const clearRoomState = useCallback(() => {
    window.clearInterval(heartbeatRef.current)
    heartbeatRef.current = null
    roomRef.current = null
    streamRef.current = null
    setActiveStream(null)
    setVideoTrack(null)
    setViewerCount(0)
    setMessages([])
    setConnectionStatus('')
    setMicrophoneEnabled(false)
    setCameraEnabled(false)
    audioContainerRef.current?.replaceChildren()
    endingRef.current = false
  }, [])

  useEffect(() => () => {
    window.clearInterval(heartbeatRef.current)
    const room = roomRef.current
    const stream = streamRef.current
    roomRef.current = null
    if (room) room.disconnect()
    if (stream?.isHost && !endingRef.current) {
      apiRequest(`/live/${stream.id}/end`, { method: 'POST' })
        .catch((cleanupError) => console.error('Could not end the live stream after leaving', cleanupError))
    }
  }, [])

  async function connectToStream(stream, url, token, isHost) {
    const { Room, RoomEvent, VideoPresets, VideoQuality } = await import('livekit-client')
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      ...(lowData ? {
        videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
        publishDefaults: {
          videoEncoding: VideoPresets.h360.encoding,
          videoSimulcastLayers: [VideoPresets.h180],
        },
      } : {}),
    })
    const streamDetails = { ...stream, isHost }
    roomRef.current = room
    streamRef.current = streamDetails
    setActiveStream(streamDetails)
    setViewerCount(stream.viewerCount ?? 0)
    setMessages([])
    setError('')
    setConnectionStatus('Connecting...')

    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      if (track.kind === 'video') {
        if (lowData) publication.setVideoQuality(VideoQuality.LOW)
        setVideoTrack(track)
      } else {
        const audioElement = track.attach()
        audioElement.autoplay = true
        audioElementContainerAppend(audioElement)
      }
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => element.remove())
      if (track.kind === 'video') {
        setVideoTrack((current) => current === track ? null : current)
      }
    })
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.kind === 'video' && publication.track) {
        setVideoTrack(publication.track)
      }
    })
    const updateViewerCount = () => setViewerCount(room.remoteParticipants.size)
    room.on(RoomEvent.ParticipantConnected, updateViewerCount)
    room.on(RoomEvent.ParticipantDisconnected, updateViewerCount)
    room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      if (topic !== chatTopic) return
      try {
        const message = JSON.parse(new TextDecoder().decode(payload))
        if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > maxChatLength) return
        setMessages((current) => [...current.slice(-99), {
          id: crypto.randomUUID(),
          author: participant?.name || 'Viewer',
          text: message.text.trim(),
        }])
      } catch (messageError) {
        console.error('Could not read a live chat message', messageError)
      }
    })
    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current !== room) return
      const currentStream = streamRef.current
      const shouldEndStream = currentStream?.isHost && !endingRef.current
      clearRoomState()
      if (shouldEndStream) {
        apiRequest(`/live/${currentStream.id}/end`, { method: 'POST' })
          .catch((cleanupError) => console.error('Could not end the disconnected live stream', cleanupError))
      }
    })

    try {
      await room.connect(url, token)
      setConnectionStatus('Live')
      setViewerCount(room.remoteParticipants.size)
      if (isHost) {
        await room.localParticipant.setCameraEnabled(true)
        setCameraEnabled(true)
        await room.localParticipant.setMicrophoneEnabled(true)
        setMicrophoneEnabled(true)
        heartbeatRef.current = window.setInterval(() => {
          apiRequest(`/live/${stream.id}/heartbeat`, { method: 'POST' })
            .catch((heartbeatError) => setError(heartbeatError.message))
        }, 20000)
      }
    } catch (connectError) {
      endingRef.current = true
      await room.disconnect()
      clearRoomState()
      if (isHost) {
        await apiRequest(`/live/${stream.id}/end`, { method: 'POST' })
          .catch((cleanupError) => console.error('Could not clean up the failed live stream', cleanupError))
      }
      throw connectError
    }
  }

  function audioElementContainerAppend(element) {
    if (audioContainerRef.current) audioContainerRef.current.appendChild(element)
  }

  async function startBroadcast(event) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Add a title for your live stream')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest('/live', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim() }),
      })
      await connectToStream(result.stream, result.url, result.token, true)
      setTitle('')
      await loadStreams()
    } catch (requestError) {
      setError(requestError.message || 'Could not start the live stream')
    } finally {
      setBusy(false)
    }
  }

  async function joinBroadcast(stream) {
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest(`/live/${stream.id}/token`, { method: 'POST' })
      await connectToStream(result.stream, result.url, result.token, result.isHost)
    } catch (requestError) {
      setError(requestError.message || 'Could not join this live stream')
    } finally {
      setBusy(false)
    }
  }

  async function leaveBroadcast() {
    const stream = streamRef.current
    const room = roomRef.current
    if (!stream || !room) return
    setBusy(true)
    setError('')

    try {
      if (stream.isHost) {
        endingRef.current = true
        await apiRequest(`/live/${stream.id}/end`, { method: 'POST' })
      }
      await room.disconnect()
      if (roomRef.current === room) clearRoomState()
      await loadStreams()
    } catch (requestError) {
      endingRef.current = false
      setError(requestError.message || 'Could not leave the live stream')
    } finally {
      setBusy(false)
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current
    if (!room || !isHost) return
    try {
      const enabled = !microphoneEnabled
      await room.localParticipant.setMicrophoneEnabled(enabled)
      setMicrophoneEnabled(enabled)
    } catch (toggleError) {
      setError(toggleError.message || 'Could not change your microphone')
    }
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room || !isHost) return
    try {
      const enabled = !cameraEnabled
      await room.localParticipant.setCameraEnabled(enabled)
      setCameraEnabled(enabled)
    } catch (toggleError) {
      setError(toggleError.message || 'Could not change your camera')
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = messageText.trim()
    const room = roomRef.current
    if (!text || !room || text.length > maxChatLength) return

    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ text })),
        { reliable: true, topic: chatTopic },
      )
      setMessages((current) => [...current.slice(-99), {
        id: crypto.randomUUID(),
        author: user?.name || 'You',
        text,
      }])
      setMessageText('')
    } catch (sendError) {
      setError(sendError.message || 'Could not send your live comment')
    }
  }

  const isHost = activeStream?.isHost

  return (
    <section className='live-page'>
      <header className='live-header'>
        <div>
          <span className='live-eyebrow'>QAVERO LIVE</span>
          <h1>{t('Live broadcasts')}</h1>
          <p>{t('Go live with your community or join a broadcast.')}</p>
        </div>
        {activeStream && (
          <span className='live-status'>
            <span className='live-status-dot' />
            {connectionStatus}
          </span>
        )}
      </header>

      {error && <p className='live-error' role='alert'>{error}</p>}

      {activeStream ? (
        <div className='live-room'>
          <div className='live-stage-column'>
            <div className='live-stage'>
              <video
                ref={videoRef}
                className='live-video'
                autoPlay
                playsInline
                muted={isHost}
                aria-label={`Live video: ${activeStream.title}`}
              />
              <div className='live-stage-badge'><span /> LIVE</div>
              <div className='live-stage-details'>
                <strong>{activeStream.title}</strong>
                <span>by {activeStream.host.name}</span>
              </div>
              <div className='live-viewer-count'>
                <FontAwesomeIcon icon={faEye} /> {viewerCount}
              </div>
              <button
                type='button'
                className='live-leave-button'
                onClick={leaveBroadcast}
                disabled={busy}
                aria-label={isHost ? t('End live stream') : t('Leave live stream')}
              >
                <FontAwesomeIcon icon={faPhoneSlash} />
                  {isHost ? t('End live') : t('Leave')}
              </button>
              {!isHost && !videoTrack && <p className='live-waiting'>{t("Waiting for the host's video...")}</p>}
              {isHost && !cameraEnabled && <p className='live-waiting'>{t('Your camera is off.')}</p>}
              <div className='live-audio-tracks' ref={audioContainerRef} />
              {isHost && (
                <div className='live-host-controls'>
                  <button type='button' onClick={toggleMicrophone} aria-label={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                    <FontAwesomeIcon icon={microphoneEnabled ? faMicrophone : faMicrophoneSlash} />
                  </button>
                  <button type='button' onClick={toggleCamera} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>
                    <FontAwesomeIcon icon={cameraEnabled ? faVideo : faVideoSlash} />
                  </button>
                </div>
              )}
            </div>
            {isHost && <p className='live-host-tip'><FontAwesomeIcon icon={faVideo} /> {t('Control your camera and microphone while you are live.')}</p>}
          </div>

          <aside className='live-chat'>
            <h2><FontAwesomeIcon icon={faComments} /> {t('Live chat')}</h2>
            <div className='live-chat-messages' aria-live='polite'>
              {!messages.length && <p className='live-chat-empty'>Say hello to the community.</p>}
              {messages.map((message) => (
                <p className='live-chat-message' key={message.id}>
                  <strong>{message.author}</strong> {message.text}
                </p>
              ))}
            </div>
            <form onSubmit={sendMessage} className='live-chat-form'>
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={t('Write a comment')}
                maxLength={maxChatLength}
                aria-label='Write a live comment'
                disabled={busy}
              />
              <button type='submit' disabled={!messageText.trim() || busy}>{t('Send')}</button>
            </form>
          </aside>
        </div>
      ) : (
        <div className='live-discover'>
          <form className='live-start-form' onSubmit={startBroadcast}>
            <h2>{t('Start a live broadcast')}</h2>
            <label htmlFor='live-title'>{t('What is your live about?')}</label>
            <input
              id='live-title'
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('Add a title')}
              maxLength={120}
              disabled={busy}
            />
            <button type='submit' disabled={busy}>
              <FontAwesomeIcon icon={faVideo} />
              {busy ? t('Connecting...') : t('Go live')}
            </button>
            <p>{t('Starting a broadcast will ask for camera and microphone access.')}</p>
          </form>

          <div className='live-list-section'>
            <h2>{t('Happening now')}</h2>
            {loading && <p role='status'>{t('Loading live streams...')}</p>}
            {!loading && !streams.length && !error && <p>{t('No one is live right now. Start the first broadcast.')}</p>}
            <div className='live-stream-list'>
              {streams.map((stream) => (
                <article className='live-stream-card' key={stream.id}>
                  <div className='live-stream-avatar'>
                    {stream.host.avatar
                      ? <img src={getMediaUrl(stream.host.avatar)} alt='' />
                      : <span>{stream.host.name?.[0] ?? '?'}</span>}
                  </div>
                  <div className='live-stream-info'>
                    <strong>{stream.title}</strong>
                    <span>{stream.host.name}</span>
                    <small><FontAwesomeIcon icon={faEye} /> {stream.viewerCount} watching</small>
                  </div>
                  <button type='button' onClick={() => joinBroadcast(stream)} disabled={busy}>
                    {stream.host.id === user?.id ? t('Return to live') : t('Watch live')}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
