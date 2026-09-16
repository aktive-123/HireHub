import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import heroImg from '@/assets/chair.png'
import heroBg1 from '@/assets/hero2.jpg'
import heroBg2 from '@/assets/hero3.jpg'
import heroBg3 from '@/assets/hero4.jpg'
import heroBg4 from '@/assets/hero5.jpg'
import heroBg5 from '@/assets/hero6.jpg'
import useInView from '../../hooks/useInView'

const heroSlides = [heroBg1, heroBg2, heroBg3, heroBg4, heroBg5]

export default function HeroSection() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [heroRef, heroInView] = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.append('q', keyword)
    if (location) params.append('loc', location)
    if (jobType) params.append('type', jobType)
    navigate(`/jobs?${params.toString()}`)
  }

  const popularTags = [
    'Frontend Developer',
    'Backend Developer',
    'UI/UX Designer',
    'Marketing Specialist',
    'Data Analyst',
  ]

  return (
    <section ref={heroRef} className={`hh-hero ${heroInView ? 'is-anim' : ''}`}>
      <div className="hh-hero-slides" aria-hidden="true">
        {heroSlides.map((src, i) => (
          <div
            key={src}
            className={`hh-hero-slide ${i === slideIndex ? 'is-active' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
      <div className="hh-hero-tint" aria-hidden="true" />
      <div className="hh-hero-scrim" aria-hidden="true" />
      <div className="page-container">
        <div className="row align-items-center g-5">
          {/* Left Hero Content */}
          <div className="col-12 col-lg-7">
            <h1 className="hh-hero-title">
              <span className="hh-hero-title-line">Find Your Next</span>
              <span className="hh-hero-title-highlight">Career Move</span>
            </h1>

            <p className="hh-hero-subtitle">
              Discover top job opportunities from leading companies and take the next step in your career.
              Whether you&apos;re hiring or looking for a job, HireHub makes it simple.
            </p>

            <div className="hh-hero-cta-group">
              <Link to="/jobs" className="hh-btn hh-btn-primary hh-btn-lg hh-btn-pill hh-hero-cta-btn">
                Find Jobs <i className="bi bi-arrow-right hh-btn-arrow" aria-hidden="true" />
              </Link>
              <Link to="/employer/jobs/create" className="hh-btn hh-btn-outline-white hh-btn-lg hh-btn-pill hh-hero-cta-btn">
                Post a Job <i className="bi bi-arrow-right hh-btn-arrow" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="col-12 col-lg-5">
            <div className="hh-hero-media-wrapper">
              <div className="hh-hero-media-card">
                <img
                  src={heroImg}
                  alt="HireHub Platform Opportunity"
                  className="hh-hero-img"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Search Bar */}
        <div className="hh-hero-search-wrapper">
          <form onSubmit={handleSearchSubmit} className="hh-hero-search-bar" role="search">
            <div className="hh-search-field">
              <i className="bi bi-search hh-search-field-icon" aria-hidden="true" />
              <input
                type="text"
                className="hh-search-field-input"
                placeholder="Job title, keywords, or company"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="Job title, keywords, or company"
              />
            </div>

            <div className="hh-search-field">
              <i className="bi bi-geo-alt hh-search-field-icon" aria-hidden="true" />
              <select
                className="hh-search-field-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Location"
              >
                <option value="">Location (All locations)</option>
                <option value="Lagos, Nigeria">Lagos, Nigeria</option>
                <option value="Abuja, Nigeria">Abuja, Nigeria</option>
                <option value="Remote">Remote</option>
                <option value="London, UK">London, UK</option>
                <option value="San Francisco, USA">San Francisco, USA</option>
              </select>
            </div>

            <div className="hh-search-field hh-search-field--last">
              <i className="bi bi-briefcase hh-search-field-icon" aria-hidden="true" />
              <select
                className="hh-search-field-select"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                aria-label="Job type"
              >
                <option value="">Job type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <button type="submit" className="hh-btn hh-btn-primary hh-btn-lg">
              <i className="bi bi-search" aria-hidden="true" />
              Search Jobs
            </button>
          </form>

          {/* Popular Search Tags */}
          <div className="hh-hero-popular-tags">
            <span>Popular searches:</span>
            {popularTags.map((tag) => (
              <Link
                key={tag}
                to={`/jobs?q=${encodeURIComponent(tag)}`}
                className="hh-hero-tag-btn"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
