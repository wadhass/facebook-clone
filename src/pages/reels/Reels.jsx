import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment, faHeart } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'
import Comments from '../../components/comments/Comments'
import './reels.css'

export default function Reels() {
  const { user } = useAuth()
  const [reels, setReels] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [openComments, setOpenComments] = useState('')

  const loadReels = useCallback(async () => {
    try {
      const { reels: loadedReels } = await apiRequest('/posts/reels?page=1')
      setReels(loadedReels)
      setPage(1)
      setHasMore(loadedReels.length === 10)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReels()
    window.addEventListener('posts:updated', loadReels)
    return () => window.removeEventListener('posts:updated', loadReels)
  }, [loadReels])

  async function loadMore() {
    setLoadingMore(true)
    setError('')
    try {
      const { reels: nextReels } = await apiRequest(`/posts/reels?page=${page + 1}`)
      setReels((current) => [...current, ...nextReels])
      setPage((current) => current + 1)
      setHasMore(nextReels.length === 10)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
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

  return (
    <section className='reels-page'>
      <header className='reels-header'>
        <div>
          <span className='reels-eyebrow'>SHORT VIDEOS</span>
          <h1>Reels</h1>
          <p>Watch videos shared by your community.</p>
        </div>
        <Link className='reels-create-link' to='/'>Create a Reel</Link>
      </header>
      {error && <p className='reels-error' role='alert'>{error}</p>}
      {loading && <p role='status'>Loading reels...</p>}
      {!loading && !reels.length && !error && (
        <p className='reels-empty'>No reels yet. Share a video from your feed to get started.</p>
      )}
      <div className='reels-list'>
        {reels.map((reel) => {
          const liked = reel.likes?.some((like) => (
            typeof like === 'string' ? like === user?.id : like.id === user?.id
          ))
          return (
            <article className='reel-card' key={reel.id}>
              <video
                src={getMediaUrl(reel.mediaUrl)}
                controls
                playsInline
                muted
                loop
                preload='metadata'
                aria-label={`Reel by ${reel.author.name}`}
              />
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
                  className={liked ? 'is-liked' : ''}
                  onClick={() => toggleLike(reel.id)}
                  aria-label={liked ? 'Unlike reel' : 'Like reel'}
                >
                  <FontAwesomeIcon icon={faHeart} />
                  <span>{reel.likes?.length ?? 0}</span>
                </button>
                <button
                  type='button'
                  onClick={() => setOpenComments((current) => current === reel.id ? '' : reel.id)}
                  aria-label='Show comments'
                >
                  <FontAwesomeIcon icon={faComment} />
                  <span>{reel.comments?.length ?? 0}</span>
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
      </div>
      {hasMore && (
        <button type='button' className='btn btn-primary reels-load-more' onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more reels'}
        </button>
      )}
    </section>
  )
}
