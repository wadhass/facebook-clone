import './stories.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, getMediaUrl } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { usePreferences } from '../../preferences/usePreferences'
import UserStory from './UserStory'

export default function Stories () {
  const { user } = useAuth()
  const { lowData, t } = usePreferences()
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

  async function addStories(files) {
    setError('')
    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Choose image or video files')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('Each story must be 50 MB or smaller')
        return
      }
    }

    setUploading(true)
    let uploadedCount = 0
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('media', file)
        await apiRequest('/stories', { method: 'POST', body: formData })
        uploadedCount += 1
      }
      await loadStories()
    } catch (requestError) {
      if (uploadedCount > 0) await loadStories()
      setError(
        uploadedCount > 0
          ? `Uploaded ${uploadedCount} of ${files.length} stories. ${requestError.message}`
          : requestError.message,
      )
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
      <UserStory user={user} onCreate={addStories} uploading={uploading} />
      {storyGroups.map((group) => (
        <button
          type='button'
          className='story story-card'
          key={group.author.id}
          onClick={() => viewStory(group)}
          aria-label={`View ${group.author.name}'s stories`}
        >
          {group.stories[0].mediaType === 'video'
            ? <video src={getMediaUrl(group.stories[0].mediaUrl)} muted preload={lowData ? 'none' : 'metadata'} />
            : <img src={getMediaUrl(group.stories[0].mediaUrl)} alt='' loading='lazy' />}
          {group.author.avatar && <img className='story-avatar' src={getMediaUrl(group.author.avatar)} alt='' loading='lazy' />}
          {group.stories.length > 1 && <span className='story-count'>{group.stories.length}</span>}
          <h5>{group.author.name}</h5>
        </button>
      ))}
      {!storyGroups.length && !error && <p className='stories-empty'>{t('No active stories yet.')}</p>}
      {error && <p role='alert' className='stories-error'>{error}</p>}

      {currentStory && (
        <div
          className='story-viewer-backdrop'
          role='presentation'
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveStory(null)
          }}
        >
          <section className='story-viewer' role='dialog' aria-modal='true' aria-label={t('Story')}>
            <header>
              <span>{activeStory.group.author.name}</span>
              <button type='button' onClick={() => setActiveStory(null)} aria-label={t('Close story')}>×</button>
            </header>
            {currentStory.mediaType === 'video'
              ? <video src={getMediaUrl(currentStory.mediaUrl)} controls autoPlay preload={lowData ? 'none' : 'metadata'} />
              : <img src={getMediaUrl(currentStory.mediaUrl)} alt={currentStory.text || 'Story'} />}
            {currentStory.text && <p>{currentStory.text}</p>}
            <footer>
              {activeStory.group.author.id === user?.id && (
                <button type='button' className='btn btn-red' onClick={() => deleteStory(currentStory)}>
                  {t('Delete story')}
                </button>
              )}
              <button type='button' className='btn btn-primary' onClick={() => stepStory(1)}>
                {t('Next')}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
