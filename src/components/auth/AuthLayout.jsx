import { Link } from 'react-router-dom'
import './auth.css'

export default function AuthLayout({ eyebrow, title, description, footer, children }) {
  return (
    <main className='auth-page'>
      <aside className='auth-showcase' aria-label='About Qavero'>
        <Link className='auth-brand auth-brand--light' to='/login' aria-label='Qavero home'>
          <img src='/qavero.svg' alt='' />
          <span>qavero</span>
        </Link>
        <div className='auth-showcase-copy'>
          <span className='auth-showcase-eyebrow'>
            <span className='auth-eyebrow-dot' />
            A LITTLE CLOSER, EVERY DAY
          </span>
          <h1>Life feels better when it&rsquo;s <span>shared.</span></h1>
          <p>One place for your favorite people, everyday stories, and conversations that matter.</p>
        </div>
        <div className='auth-art' aria-hidden='true'>
          <div className='auth-art-orbit auth-art-orbit--one' />
          <div className='auth-art-orbit auth-art-orbit--two' />
          <div className='auth-art-sun' />
          <div className='auth-art-card auth-art-card--photo'>
            <span className='auth-art-photo' />
            <span className='auth-art-line auth-art-line--long' />
            <span className='auth-art-line auth-art-line--short' />
            <span className='auth-art-avatar auth-art-avatar--coral'>M</span>
            <span className='auth-art-avatar auth-art-avatar--blue'>J</span>
            <span className='auth-art-avatar auth-art-avatar--gold'>A</span>
          </div>
          <div className='auth-art-card auth-art-card--note'>
            <span className='auth-art-note-icon'>✦</span>
            <span>
              <strong>Good moments</strong>
              <small>are better together</small>
            </span>
          </div>
          <span className='auth-art-spark auth-art-spark--one'>✳</span>
          <span className='auth-art-spark auth-art-spark--two'>✦</span>
        </div>
        <p className='auth-showcase-caption'>A softer corner of the internet.</p>
      </aside>

      <section className='auth-panel'>
        <Link className='auth-brand auth-brand--mobile' to='/login' aria-label='Qavero home'>
          <img src='/qavero.svg' alt='' />
          <span>qavero</span>
        </Link>
        <div className='auth-content'>
          <header className='auth-heading'>
            <span className='auth-eyebrow'>{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
          {footer && <div className='auth-footer'>{footer}</div>}
        </div>
        <p className='auth-privacy'>Your space, your pace. <span>Made for real connection.</span></p>
      </section>
    </main>
  )
}
