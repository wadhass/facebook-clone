import './comments.css'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'


export default function Comments ({ comments, onComment }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onComment(text)
      setText('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='comments'>
        <div className="writebox">
            <form onSubmit={handleSubmit}>
                <div className="user">
                    {user?.avatar && <img src={user.avatar} alt="" />}
                    <input
                      type="text"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder='Write a comment'
                      maxLength={2000}
                      required
                    />
                    <button type='submit' className='btn btn-primary' disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
        {error && <p role='alert'>{error}</p>}
        {comments.map((comment) => (
            <Link to={`/profile/${comment.author.id}`} key={comment.id}>
              <div className="user">
                {comment.author.avatar && <img src={comment.author.avatar} alt="" />}
                <div>
                  <h5>{comment.author.name}</h5>
                  <p>{comment.text}</p>
                </div>
                <small>{new Date(comment.createdAt).toLocaleString()}</small>
              </div>
            </Link>
        ))}
    </div>
  )
}
