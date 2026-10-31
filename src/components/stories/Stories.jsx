import './stories.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, getMediaUrl } from '../../api'
import { useAuth } from '../../auth/useAuth'
import UserStory from './UserStory'

export default function Stories () {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [activeStory, setActiveStory] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const loadStories = useCallback(async () => {
    try {
      const { stories: loadedStories } = await apiRequest('/stories')
      setStories(loadedStories)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    loadStories()
  }, [loadStories])

  const storyGroups = useMemo(() => {
    const groups = new Map()
    stories.forEach((story) => {
      const authorId = story.author.id
      if (!groups.has(authorId)) groups.set(authorId, { author: story.author, stories: [] })
      groups.get(authorId).stories.push(story)
    })
    return [...groups.values()]
  }, [stories])

  async function addStory(file) {
    setError('')
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Choose an image or video file')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Media files must be 50 MB or smaller')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      await apiRequest('/stories', { method: 'POST', body: formData })
      await loadStories()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteStory(story) {
    try {
      await apiRequest(`/stories/${story.id}`, { method: 'DELETE' })
      setActiveStory(null)
      await loadStories()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function viewStory(group) {
    setActiveStory({ group, index: 0 })
  }

  function stepStory(direction) {
    if (!activeStory) return
    const nextIndex = activeStory.index + direction
    if (nextIndex < 0 || nextIndex >= activeStory.group.stories.length) {
      setActiveStory(null)
      return
    }
    setActiveStory({ ...activeStory, index: nextIndex })
  }

  const currentStory = activeStory?.group.stories[activeStory.index]

  return (
    <div className='stories'>
      <UserStory user={user} onCreate={addStory} uploading={uploading} />
      {storyGroups.map((group) => (
        <button
          type='button'
          className='story story-card'
          key={group.author.id}
          onClick={() => viewStory(group)}
          aria-label={`View ${group.author.name}'s stories`}
        >
          {group.stories[0].mediaType === 'video'
            ? <video src={getMediaUrl(group.stories[0].mediaUrl)} muted />
            : <img src={getMediaUrl(group.stories[0].mediaUrl)} alt='' />}
          {group.author.avatar && <img className='story-avatar' src={getMediaUrl(group.author.avatar)} alt='' />}
          <h5>{group.author.name}</h5>
        </button>
      ))}
      {!storyGroups.length && !error && <p className='stories-empty'>No active stories yet.</p>}
      {error && <p role='alert' className='stories-error'>{error}</p>}

      {currentStory && (
        <div
          className='story-viewer-backdrop'
          role='presentation'
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveStory(null)
          }}
        >
          <section className='story-viewer' role='dialog' aria-modal='true' aria-label='Story'>
            <header>
              <span>{activeStory.group.author.name}</span>
              <button type='button' onClick={() => setActiveStory(null)} aria-label='Close story'>×</button>
            </header>
            {currentStory.mediaType === 'video'
              ? <video src={getMediaUrl(currentStory.mediaUrl)} controls autoPlay />
              : <img src={getMediaUrl(currentStory.mediaUrl)} alt={currentStory.text || 'Story'} />}
            {currentStory.text && <p>{currentStory.text}</p>}
            <footer>
              {activeStory.group.author.id === user?.id && (
                <button type='button' className='btn btn-red' onClick={() => deleteStory(currentStory)}>
                  Delete story
                </button>
              )}
              <button type='button' className='btn btn-primary' onClick={() => stepStory(1)}>
                Next
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
