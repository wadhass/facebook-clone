import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, getMediaUrl } from '../../api'
import { usePreferences } from '../../preferences/usePreferences'
import './explore.css'

export default function Explore() {
  const { lowData, t } = usePreferences()
  const [posts, setPosts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadExplore = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [postsResult, discoverResult] = await Promise.all([
        apiRequest('/posts?page=1'),
        apiRequest('/friends/discover'),
      ])

      const loadedPosts = Array.isArray(postsResult.posts) ? postsResult.posts : []
      const loadedSuggestions = Array.isArray(discoverResult.users) ? discoverResult.users : []

      const sortedPosts = [...loadedPosts].sort((a, b) => {
        const scoreA = (a.likes?.length ?? 0) + (a.comments?.length ?? 0) * 2 + (a.isReel ? 5 : 0)
        const scoreB = (b.likes?.length ?? 0) + (b.comments?.length ?? 0) * 2 + (b.isReel ? 5 : 0)
        return scoreB - scoreA
      })

      setPosts(sortedPosts)
      setSuggestions(loadedSuggestions.slice(0, 6))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExplore()
  }, [loadExplore])

  const trendingPosts = useMemo(() => posts.slice(0, 4), [posts])
  const featuredCreators = useMemo(() => suggestions.slice(0, 4), [suggestions])
  const morePosts = useMemo(() => posts.slice(4), [posts])

  return (
    <section className='explore-page'>
      <header className='explore-header'>
        <div>
          <span className='explore-eyebrow'>{t('DISCOVER')}</span>
          <h1>{t('Explore')}</h1>
          <p>{t('Trending moments, creator picks, and fresh ideas from your community.')}</p>
        </div>
      </header>

      {error && <p className='explore-error' role='alert'>{error}</p>}
      {loading && <p className='explore-status' role='status'>{t('Loading the feed...')}</p>}

      {!loading && !error && (
        <>
          <section className='explore-section'>
            <div className='section-heading'>
              <h2>{t('Trending now')}</h2>
              <Link to='/reels'>{t('See all reels')}</Link>
            </div>
            <div className='explore-trending-grid'>
              {trendingPosts.map((post) => {
                const preview = post.mediaUrl ? getMediaUrl(post.mediaUrl) : ''
                const score = (post.likes?.length ?? 0) + (post.comments?.length ?? 0) * 2

                return (
                  <article className='explore-card trending-card' key={post.id}>
                    {preview && post.mediaType === 'video' ? (
                      <video src={preview} muted playsInline loop preload={lowData ? 'none' : 'metadata'} />
                    ) : preview ? (
                      <img src={preview} alt={post.text || 'Trending post'} loading='lazy' />
                    ) : (
                      <div className='trending-copy-only'>
                        <p>{post.text || t('Community update')}</p>
                      </div>
                    )}
                    <div className='explore-card-body'>
                      <span className='trend-score'>🔥 {score} buzz</span>
                      <h3>{post.author?.name || 'Qavero member'}</h3>
                      <p>{post.text || 'Fresh update from the community.'}</p>
                      <Link to={`/profile/${post.author?.id ?? ''}`}>{t('View profile')}</Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className='explore-section'>
            <div className='section-heading'>
              <h2>{t('Suggested creators')}</h2>
              <Link to='/friends?tab=discover'>{t('Meet more people')}</Link>
            </div>
            <div className='creator-grid'>
              {featuredCreators.map((person) => (
                <article className='explore-card creator-card' key={person.id}>
                  <Link to={`/profile/${person.id}`} className='creator-link'>
                    {person.avatar ? (
                      <img src={getMediaUrl(person.avatar)} alt={person.name} loading='lazy' className='creator-avatar' />
                    ) : (
                      <span className='creator-avatar placeholder'>{person.name?.[0] ?? '?'}</span>
                    )}
                    <div>
                      <h3>{person.name}</h3>
                      <small>{t('Suggested for you')}</small>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className='explore-section'>
            <div className='section-heading'>
              <h2>{t('Fresh for you')}</h2>
              <Link to='/'>{t('Home feed')}</Link>
            </div>
            <div className='explore-feed-grid'>
              {morePosts.map((post) => (
                <article className='explore-mini-card' key={post.id}>
                  <Link to={`/profile/${post.author?.id ?? ''}`} className='mini-author'>
                    {post.author?.avatar ? (
                      <img src={getMediaUrl(post.author.avatar)} alt='' loading='lazy' />
                    ) : (
                      <span>{post.author?.name?.[0] ?? '?'}</span>
                    )}
                    <strong>{post.author?.name || 'Qavero'}</strong>
                  </Link>
                  {post.mediaUrl && (
                    <div className='mini-media'>
                      {post.mediaType === 'video' ? (
                        <video src={getMediaUrl(post.mediaUrl)} muted playsInline preload={lowData ? 'none' : 'metadata'} />
                      ) : (
                        <img src={getMediaUrl(post.mediaUrl)} alt={post.text || 'Post'} loading='lazy' />
                      )}
                    </div>
                  )}
                  <p>{post.text || t('A community highlight')}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
