import { useParams } from 'react-router-dom'
import PageHero from '@/components/ui/PageHero'
import SectionHeading from '@/components/ui/SectionHeading'
import Reveal from '@/components/ui/Reveal'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import AuthorAvatar from '@/components/ui/AuthorAvatar'
import {
  RESOURCES,
  ARTICLE_CATEGORY_LABEL,
} from '@/data/resources'
import { ResourceCard } from './CareerResourcesPage'
import heroResume1 from '@/assets/hero4.jpg'
import heroResume2 from '@/assets/hero5.jpg'
import heroInterview1 from '@/assets/hero3.jpg'
import heroInterview2 from '@/assets/hero6.jpg'
import heroGrowth1 from '@/assets/hero2.jpg'
import heroGrowth2 from '@/assets/hero5.jpg'

const CATEGORY_HERO_SLIDES = {
  resume: [heroResume1, heroResume2],
  interviews: [heroInterview1, heroInterview2],
  growth: [heroGrowth1, heroGrowth2],
}

export default function CareerArticlePage() {
  const { slug } = useParams()
  const article = RESOURCES.find((r) => r.slug === slug)

  if (!article) {
    return (
      <section className="page-container">
        <EmptyState
          icon="file-earmark-x"
          title="Article not found"
          text="The article you're looking for doesn't exist or has been moved."
          action={<Button to="/resources" variant="primary">Back to Career Resources</Button>}
        />
      </section>
    )
  }

  const related = RESOURCES.filter(
    (r) => r.category === article.category && r.slug !== article.slug
  ).slice(0, 3)

  return (
    <>
      <PageHero
        deep
        images={CATEGORY_HERO_SLIDES[article.category] || []}
        className="hh-hero--article"
        title={article.title}
      >
        <div className="hh-article-meta">
          <span className="hh-chip">{ARTICLE_CATEGORY_LABEL[article.category]}</span>
          <span className="hh-article-meta-item">
            <AuthorAvatar name={article.author} size={22} />
            {article.author}, {article.role}
          </span>
          <span className="hh-article-meta-item">
            <i className="bi bi-calendar3" aria-hidden="true" />
            {article.date}
          </span>
          <span className="hh-article-meta-item">
            <i className="bi bi-clock" aria-hidden="true" />
            {article.readTime}
          </span>
        </div>
      </PageHero>

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-article-body">
            <Reveal>
              <p className="hh-article-intro">{article.intro}</p>
            </Reveal>

            {article.sections.map((section, index) => (
              <Reveal key={section.heading} delay={index * 60}>
                <section className="hh-article-block">
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  {section.bullets && (
                    <ul className="hh-list-checks">
                      {section.bullets.map((item) => (
                        <li key={item}>
                          <i className="bi bi-check-circle-fill" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ))}

            <Reveal>
              <aside className="hh-article-cta">
                <div>
                  <div className="hh-section-eyebrow">NEXT STEP</div>
                  <h2>{article.ctaTitle}</h2>
                  <p>{article.ctaText}</p>
                </div>
                <div className="hh-toolbar">
                  <Button to="/jobs" pill size="lg">Find Jobs</Button>
                  <Button to="/register/job-seeker" pill size="lg" variant="outline">
                    Create Your Profile
                  </Button>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="hh-section-space hh-bg-light-blue">
          <div className="page-container">
            <Reveal>
              <SectionHeading
                eyebrow="KEEP READING"
                title={`More from ${ARTICLE_CATEGORY_LABEL[article.category]}`}
                subtitle="Browse related guides to keep building momentum."
              />
            </Reveal>
            <div className="hh-resource-grid hh-mt-5">
              {related.map((item) => (
                <ResourceCard key={item.slug} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}