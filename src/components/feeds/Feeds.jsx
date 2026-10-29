import './feeds.css'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../api'
import Feed from './Feed'

export default function Feeds ({ authorId }) {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPosts = useCallback(async () => {
    try {
      const path = authorId
        ? `/posts?author=${encodeURIComponent(authorId)}&page=1`
        : '/posts?page=1'
      const { posts: loadedPosts } = await apiRequest(path)
      setPosts(loadedPosts)
      setPage(1)
      setHasMore(loadedPosts.length === 20)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [authorId])

  async function loadMore() {
    setLoadingMore(true)
    setError('')
    try {
      const query = new URLSearchParams({ page: String(page + 1) })
      if (authorId) query.set('author', authorId)
      const { posts: nextPosts } = await apiRequest(`/posts?${query}`)
      setPosts((current) => [...current, ...nextPosts])
      setPage((current) => current + 1)
      setHasMore(nextPosts.length === 20)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadPosts()
    window.addEventListener('posts:updated', loadPosts)
    return () => window.removeEventListener('posts:updated', loadPosts)
  }, [loadPosts])

  return (
    <div className='feeds'>
      {error && <p role='alert'>{error}</p>}
      {!error && posts.length === 0 && <p>No posts yet. Share something to get started.</p>}
      {posts.map((post) => <Feed fed={post} key={post.id} />)}
      {hasMore && posts.length > 0 && (
        <button type='button' className='btn btn-primary' onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load older posts'}
        </button>
      )}
    </div>
  )
}
