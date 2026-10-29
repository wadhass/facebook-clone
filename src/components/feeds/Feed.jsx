import { Link } from 'react-router-dom'
import './feeds.css'

import { useState } from 'react'
import Comments from '../comments/Comments'
import { useAuth } from '../../auth/useAuth'
import { apiRequest, getMediaUrl } from '../../api'

// Font Awesome Icon..........
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment, faHeart, faTrash } from '@fortawesome/free-solid-svg-icons'

export default function Feed ({fed}) {
    const { user } = useAuth()
    const [post, setPost] = useState(fed)
    const [openComment, setOpenComment] = useState(false)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const liked = post.likes?.some((like) => (
      typeof like === 'string' ? like === user?.id : like.id === user?.id
    ))

    async function toggleLike() {
      setError('')
      try {
        const result = await apiRequest(`/posts/${post.id}/like`, { method: 'POST' })
        setPost((current) => ({
          ...current,
          likes: result.liked
            ? [...current.likes, user.id]
            : current.likes.filter((like) => (
              (typeof like === 'string' ? like : like.id) !== user.id
            )),
        }))
      } catch (requestError) {
        setError(requestError.message)
      }
    }

    async function addComment(text) {
      const { comment } = await apiRequest(`/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      setPost((current) => ({ ...current, comments: [...current.comments, comment] }))
    }

    async function deletePost() {
      setError('')
      setDeleting(true)
      try {
        await apiRequest(`/posts/${post.id}`, { method: 'DELETE' })
        window.dispatchEvent(new Event('posts:updated'))
      } catch (requestError) {
        setError(requestError.message)
        setDeleting(false)
      }
    }

  return (
    <div className='feed'>
        <div className='top-content'>
            <Link to={`/profile/${post.author.id}`}>
            <div className="user">
                {post.author.avatar && <img src={post.author.avatar} alt="" />}
                <div>
                <h5>{post.author.name}</h5>
                <small>{new Date(post.createdAt).toLocaleString()}</small>
                </div>
            </div>
            </Link>
            {post.author.id === user?.id && (
              <button
                type='button'
                className='post-delete'
                disabled={deleting}
                aria-label='Delete post'
                title='Delete post'
                onClick={deletePost}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
        </div>
        <div className="mid-content">
            <p>{post.text}</p>
            {post.mediaUrl && post.mediaType === 'video' && (
              <video src={getMediaUrl(post.mediaUrl)} controls className='post-attachment' />
            )}
            {post.mediaUrl && post.mediaType === 'image' && (
              <img src={getMediaUrl(post.mediaUrl)} alt='Post attachment' className='post-attachment' />
            )}
            {post.imageUrl && <img src={post.imageUrl} alt="Post attachment" />}
        </div>
        <div className="bottom-content">
            <div className="action-item" onClick={toggleLike} role='button' tabIndex={0} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') toggleLike()
            }}>
                <span><FontAwesomeIcon icon={faHeart} /> {post.likes.length} Like{post.likes.length === 1 ? '' : 's'}</span>
            </div>
            <button type='button' className="action-item" onClick={() => setOpenComment(!openComment)}>
                <span><FontAwesomeIcon icon={faComment} /> {post.comments.length} Comment{post.comments.length === 1 ? '' : 's'}</span>
            </button>
        </div>
        {liked && <span className='sr-only'>You liked this post</span>}
        {error && <p role='alert'>{error}</p>}
        {openComment && <Comments comments={post.comments} onComment={addComment} />}
    </div>
  )
}
