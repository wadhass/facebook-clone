import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBookmark,
  faComment,
  faHeart,
  faPause,
  faPlay,
  faShare,
  faVolumeHigh,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'
import Comments from '../../components/comments/Comments'
import { usePreferences } from '../../preferences/usePreferences'
import './reels.css'

export default function Reels() {
  const { user } = useAuth()
  const { lowData, t } = usePreferences()
  const feedRef = useRef(null)
  const videoRefs = useRef(new Map())
  const [reels, setReels] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [openComments, setOpenComments] = useState('')
  const [feed, setFeed] = useState('for-you')
  const [activeReel, setActiveReel] = useState('')
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(() => !lowData)
  const [notice, setNotice] = useState('')
  const loadRequestRef = useRef(0)

  const loadReels = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setLoadingMore(false)
    setReels([])
    setHasMore(false)
    setError('')
    try {
      const { reels: loadedReels } = await apiRequest(`/posts/reels?page=1&feed=${feed}`)
      if (requestId !== loadRequestRef.current) return
      setReels(loadedReels)
      setPage(1)
      setHasMore(loadedReels.length === 10)
      setError('')
    } catch (requestError) {
      if (requestId !== loadRequestRef.current) return
      setError(requestError.message)
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false)
    }
  }, [feed])

  useEffect(() => {
    loadReels()
    window.addEventListener('posts:updated', loadReels)
    return () => {
      loadRequestRef.current += 1
      window.removeEventListener('posts:updated', loadReels)
    }
  }, [loadReels])

  useEffect(() => {
    const container = feedRef.current
    if (!container || !reels.length) return undefined

    const observer = new IntersectionObserver((entries) => {
      const mostVisible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (mostVisible) setActiveReel(mostVisible.target.dataset.reelId)
    }, { root: container, threshold: [0.6, 0.8] })

    container.querySelectorAll('[data-reel-id]').forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [reels])

  useEffect(() => {
    setPlaying(!lowData)
  }, [lowData])

  useEffect(() => {
    if (!notice) return undefined
    const timeoutId = window.setTimeout(() => setNotice(''), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    for (const [reelId, video] of videoRefs.current) {
      if (reelId !== activeReel || !playing) {
        video.pause()
        continue
      }

      video.muted = muted
      video.play().catch((playError) => {
        if (playError.name !== 'AbortError' && playError.name !== 'NotAllowedError') {
          console.error('Could not play reel video', playError)
        }
      })
    }
  }, [activeReel, muted, playing, reels])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, button, a')) return
      const direction = event.key === 'ArrowDown' || event.key === 'PageDown'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'PageUp'
          ? -1
          : 0
      if (!direction) return

      event.preventDefault()
      const cards = [...(feedRef.current?.querySelectorAll('[data-reel-id]') ?? [])]
      const activeIndex = cards.findIndex((card) => card.dataset.reelId === activeReel)
      const nextCard = cards[activeIndex + direction]
      if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeReel])

  async function loadMore() {
    const requestId = loadRequestRef.current
    setLoadingMore(true)
    setError('')
    try {
      const { reels: nextReels } = await apiRequest(`/posts/reels?page=${page + 1}&feed=${feed}`)
      if (requestId !== loadRequestRef.current) return
      setReels((current) => [...current, ...nextReels])
      setPage((current) => current + 1)
      setHasMore(nextReels.length === 10)
    } catch (requestError) {
      if (requestId !== loadRequestRef.current) return
      setError(requestError.message)
    } finally {
      if (requestId === loadRequestRef.current) setLoadingMore(false)
    }
  }

  async function toggleSave(reelId) {
    try {
      const { saved } = await apiRequest(`/posts/${reelId}/save`, { method: 'POST' })
      if (feed === 'saved' && !saved) {
        setReels((current) => current.filter((reel) => reel.id !== reelId))
        return
      }
      setReels((current) => current.map((reel) => (
        reel.id === reelId ? { ...reel, isSaved: saved } : reel
      )))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function toggleLike(reelId) {
    try {
      const { liked } = await apiRequest(`/posts/${reelId}/like`, { method: 'POST' })
      setReels((current) => current.map((reel) => {
        if (reel.id !== reelId) return reel
        const likes = reel.likes ?? []
        return {
          ...reel,
          likes: liked
            ? [...likes, user.id]
            : likes.filter((like) => (typeof like === 'string' ? like : like.id) !== user.id),
        }
      }))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function addComment(reelId, text) {
    const { comment } = await apiRequest(`/posts/${reelId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
    setReels((current) => current.map((reel) => (
      reel.id === reelId
        ? { ...reel, comments: [...(reel.comments ?? []), comment] }
        : reel
    )))
  }

  async function shareReel(reel) {
    const url = `${window.location.origin}/reels`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${reel.author.name}'s Reel`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setNotice(t('Reel link copied'))
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError(t('Could not share this Reel'))
    }
  }

  function togglePlayback(reelId) {
    if (activeReel === reelId) setPlaying((current) => !current)
    else {
      setActiveReel(reelId)
      setPlaying(true)
    }
  }

  return (
    <section className='reels-page'>
      <header className='reels-header'>
        <div>
          <span className='reels-eyebrow'>{t('SHORT VIDEOS')}</span>
          <h1>{t('Reels')}</h1>
          <p>{t('Watch videos shared by your community.')}</p>
        </div>
        <Link className='reels-create-link' to='/?create=reel'>{t('Create a Reel')}</Link>
      </header>
        <div className='reels-feed-tabs' role='group' aria-label={t('Reels feeds')}>
        {[
            ['for-you', t('For You')],
            ['following', t('Following')],
            ['saved', t('Saved')],
        ].map(([feedId, label]) => (
          <button
            type='button'
            aria-pressed={feed === feedId}
            className={feed === feedId ? 'is-active' : ''}
            key={feedId}
            onClick={() => setFeed(feedId)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className='reels-error' role='alert'>{error}</p>}
      {notice && <p className='reels-notice' role='status'>{notice}</p>}
      {loading && <p role='status'>{t('Loading reels...')}</p>}
      {!loading && !reels.length && !error && (
        <p className='reels-empty'>
          {feed === 'saved'
            ? t('You have not saved any Reels yet.')
            : feed === 'following'
              ? t('People you follow have not shared any Reels yet.')
              : t('No reels yet. Share a video from your feed to get started.')}
        </p>
      )}
      <div className='reels-list' ref={feedRef} aria-label='Reels video feed'>
        {reels.map((reel) => {
          const liked = reel.likes?.some((like) => (
            typeof like === 'string' ? like === user?.id : like.id === user?.id
          ))
          return (
              <article className='reel-card' key={reel.id} data-reel-id={reel.id}>
              <video
                src={getMediaUrl(reel.mediaUrl)}
                playsInline
                  muted={muted}
                loop
                preload={lowData ? 'none' : 'metadata'}
                aria-label={`${t('Reel by')} ${reel.author.name}`}
                  ref={(video) => {
                    if (video) videoRefs.current.set(reel.id, video)
                    else videoRefs.current.delete(reel.id)
                  }}
                  onClick={() => togglePlayback(reel.id)}
                  onPlay={() => {
                    if (activeReel === reel.id) setPlaying(true)
                  }}
                  onPause={() => {
                    if (activeReel === reel.id) setPlaying(false)
                  }}
              />
                <button
                  type='button'
                  className={`reel-play-toggle${playing && activeReel === reel.id ? ' is-playing' : ''}`}
                  onClick={() => togglePlayback(reel.id)}
                  aria-label={t(playing && activeReel === reel.id ? 'Pause reel' : 'Play reel')}
                >
                  <FontAwesomeIcon icon={playing && activeReel === reel.id ? faPause : faPlay} />
                </button>
              <div className='reel-caption'>
                <Link to={`/profile/${reel.author.id}`}>
                  {reel.author.avatar
                    ? <img src={getMediaUrl(reel.author.avatar)} alt='' />
                    : <span className='reel-avatar-placeholder'>{reel.author.name?.[0] ?? '?'}</span>}
                  <strong>{reel.author.name}</strong>
                </Link>
                {reel.text && <p>{reel.text}</p>}
              </div>
              <div className='reel-actions'>
                <button
                  type='button'
                  onClick={() => setMuted((current) => !current)}
                  aria-label={t(muted ? 'Turn sound on' : 'Mute reel')}
                  aria-pressed={!muted}
                >
                  <FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} />
                  <span>{t(muted ? 'Sound off' : 'Sound on')}</span>
                </button>
                <button
                  type='button'
                  className={liked ? 'is-liked' : ''}
                  onClick={() => toggleLike(reel.id)}
                  aria-label={t(liked ? 'Unlike reel' : 'Like reel')}
                >
                  <FontAwesomeIcon icon={faHeart} />
                  <span>{reel.likes?.length ?? 0}</span>
                </button>
                <button
                  type='button'
                  onClick={() => setOpenComments((current) => current === reel.id ? '' : reel.id)}
                  aria-label={t('Show comments')}
                >
                  <FontAwesomeIcon icon={faComment} />
                  <span>{reel.comments?.length ?? 0}</span>
                </button>
                <button
                  type='button'
                  className={reel.isSaved ? 'is-saved' : ''}
                  onClick={() => toggleSave(reel.id)}
                  aria-label={t(reel.isSaved ? 'Remove from saved reels' : 'Save reel')}
                  aria-pressed={Boolean(reel.isSaved)}
                >
                  <FontAwesomeIcon icon={faBookmark} />
                  <span>{reel.isSaved ? t('Saved') : t('Save')}</span>
                </button>
                <button type='button' onClick={() => shareReel(reel)} aria-label={t('Share reel')}>
                  <FontAwesomeIcon icon={faShare} />
                  <span>{t('Share')}</span>
                </button>
              </div>
              {openComments === reel.id && (
                <div className='reel-comments'>
                  <Comments comments={reel.comments ?? []} onComment={(text) => addComment(reel.id, text)} />
                </div>
              )}
            </article>
          )
        })}
        {hasMore && (
          <button type='button' className='btn btn-primary reels-load-more' onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('Loading...') : t('Load more reels')}
          </button>
        )}
      </div>
    </section>
  )
}
