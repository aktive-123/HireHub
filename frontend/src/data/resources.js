export const RESOURCE_CATEGORIES = [
  {
    id: 'resume',
    icon: 'file-earmark-text',
    title: 'Resume & CV',
    description: 'Craft a resumé that gets you noticed and passes every recruiter scan.',
  },
  {
    id: 'interviews',
    icon: 'people',
    title: 'Interviews',
    description: 'Walk into every interview calm, prepared, and ready to impress.',
  },
  {
    id: 'growth',
    icon: 'graph-up-arrow',
    title: 'Career Growth',
    description: 'Plan, build, and grow a career you are proud of — at any stage.',
  },
]

export const RESOURCES = [
  {
    slug: 'how-to-write-a-great-cv',
    category: 'resume',
    title: 'How to Write a CV That Gets Noticed',
    excerpt:
      'Recruiters spend seconds on the first scan of your CV. Here is how to make those seconds count.',
    tone: 1,
    icon: 'journal-richtext',
    author: 'Amara Okafor',
    role: 'Senior Recruiter',
    date: 'Sep 12, 2026',
    readTime: '6 min read',
    intro:
      'A great CV does not list everything you have ever done — it sells the version of you that matches the role. Most recruiters skim before they read, so structure and signal matter more than length.',
    sections: [
      {
        heading: 'Start with a sharp summary',
        paragraphs: [
          'Open with three or four lines that say who you are, the value you bring, and the kind of role you are targeting. Avoid generic phrases like "hard-working team player" — use specific, measurable wins instead.',
        ],
      },
      {
        heading: 'Lead with outcomes, not duties',
        paragraphs: [
          'For every role, write what you achieved, not just what you were responsible for. Add numbers where you can: revenue influenced, projects shipped, customers supported.',
        ],
        bullets: [
          'Increased monthly sign-ups by 30% within a quarter',
          'Shipped 4 major features through a 6-person product team',
          'Cut reporting time from 3 days to a single automated pipeline',
        ],
      },
      {
        heading: 'Keep it scannable',
        paragraphs: [
          'Use clear section headers, consistent verb tense, and tight bullets. One page for early-career, up to two pages for senior professionals. Recruiters should find your skills and experience at a glance.',
        ],
      },
      {
        heading: 'Tailor before you send',
        paragraphs: [
          'Mirror the keywords in the job description. If the role asks for React and data visualisation, make those plain in the first third of the page. A tailored CV transforms a generic one into a serious match.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'cv-mistakes-to-avoid',
    category: 'resume',
    title: '5 CV Mistakes Quietly Killing Your Applications',
    excerpt:
      'Small errors can end an application before a recruiter talks to you. Remove these five and watch your reply rate climb.',
    tone: 2,
    icon: 'pencil-square',
    author: 'David Mensah',
    role: 'Hiring Lead',
    date: 'Sep 2, 2026',
    readTime: '4 min read',
    intro:
      'Many strong candidates are filtered out for avoidable reasons. These are the mistakes we see most often — and the quick fixes that turn a weak CV into a strong one.',
    sections: [
      {
        heading: 'A blurry, outdated photo or none at all',
        paragraphs: [
          'Where local market conventions expect a photo, include a clean, well-lit headshot. Where they do not, leave it out rather than using a cropped holiday picture.',
        ],
      },
      {
        heading: 'Typos in the first paragraph',
        paragraphs: [
          'Nothing erodes trust faster than a spelling mistake on the very first scan. Read it aloud, run a spell-check, and have someone else glance at the opening lines.',
        ],
      },
      {
        heading: 'Hiding your impact behind jargon',
        paragraphs: [
          'Words like "synergy" and "best-of-breed" tell recruiters nothing. Replace abstract descriptors with concrete results a hiring manager can picture.',
        ],
      },
      {
        heading: 'Dates that do not add up',
        paragraphs: [
          'Unexplained gaps and overlapping roles raise questions. A short honest line — "parental leave", "relocation", "full-time study" — closes the gap before it becomes a question.',
        ],
      },
      {
        heading: 'Forgetting the basics',
        paragraphs: [
          'Check your contact details at the top: email, phone, location, and portfolio links. An unlinked portfolio is a lost click — and a 404 link is worse than none.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'how-to-tailor-your-cv',
    category: 'resume',
    title: 'How to Tailor Your CV in 10 Minutes',
    excerpt:
      'You do not need to rewrite your CV for every application. A ten-minute pass on the right spots lifts your match score dramatically.',
    tone: 3,
    icon: 'sliders2',
    author: 'Amara Okafor',
    role: 'Senior Recruiter',
    date: 'Aug 24, 2026',
    readTime: '5 min read',
    intro:
      'Tailoring is not rewriting — it is reprioritising. In ten minutes you can realign your summary, reorder your bullets, and mirror the language of the job description so a screener immediately sees a fit.',
    sections: [
      {
        heading: 'Steal the role title',
        paragraphs: [
          'Use wording close to the posted title in your header and summary. Recruiters and applicant systems both search for those exact phrases.',
        ],
      },
      {
        heading: 'Reorder bullets to match the description',
        paragraphs: [
          'Read the description backwards: the last requirements are often the least critical. Push the responsibilities that mirror the first requirements to the top of your experience list.',
        ],
      },
      {
        heading: 'Mirror their vocabulary',
        paragraphs: [
          'If the ad says "marketing automation" and your CV says "email tools", use their word. Echoing terminology signals you already speak the team\u2019s language.',
        ],
      },
      {
        heading: 'Trim the bottom 20%',
        paragraphs: [
          'Cut the oldest job or the least relevant skill to make room for the match points. A focused page beats a crowded two-pager every time.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'common-interview-questions',
    category: 'interviews',
    title: '12 Common Interview Questions and How to Answer Them',
    excerpt:
      'Most interviews reuse a familiar set of questions. Prepare strong, honest answers in advance and the room feels smaller.',
    tone: 2,
    icon: 'chat-square-text',
    author: 'Lisa Chen',
    role: 'Career Coach',
    date: 'Sep 8, 2026',
    readTime: '8 min read',
    intro:
      'Behind every interview question is a simpler one: "Can you do this job, and will we enjoy working with you?" Here are the recurring questions and a structure for answering each with confidence.',
    sections: [
      {
        heading: 'Tell me about yourself',
        paragraphs: [
          'Give a 90-second summary: your current role, one stand-out achievement, and why this job is the natural next step. Do not recite your resumé line by line.',
        ],
      },
      {
        heading: 'What are your strengths and weaknesses?',
        paragraphs: [
          'Pick strengths relevant to the role and evidence each one. For weaknesses, choose something real, admit it openly, and explain the system you built to manage it.',
        ],
      },
      {
        heading: 'Why do you want to work here?',
        paragraphs: [
          'Connect your answer to their specific product, mission, or team — not just the salary or the title. Research the company before the interview so this answer is effortless.',
        ],
      },
      {
        heading: 'Behavioural questions (STAR)',
        paragraphs: [
          'For "tell me about a time…" questions use STAR: Situation, Task, Action, Result. One minute on context, most of the time on actions, and always end with the measurable outcome.',
        ],
        bullets: [
          'Situation — set the scene in one or two sentences',
          'Task — what were you responsible for?',
          'Action — what did you actually do?',
          'Result — quantify the impact and what you learned',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'how-to-prepare-for-an-interview',
    category: 'interviews',
    title: 'How to Prepare for an Interview in 3 Days',
    excerpt:
      'A calm three-day plan beats a night of cramming. Follow this rhythm to walk in prepared and composed.',
    tone: 3,
    icon: 'calendar3',
    author: 'Lisa Chen',
    role: 'Career Coach',
    date: 'Aug 15, 2026',
    readTime: '5 min read',
    intro:
      'The best interviews look effortless because the candidate prepared early. This three-day plan spreads the work out, so each step sticks and the day itself feels light.',
    sections: [
      {
        heading: 'Day one — research and match',
        paragraphs: [
          'Read their About and Careers pages, recent news, and the profiles of the people interviewing you. Map their three biggest needs to three stories from your experience.',
        ],
      },
      {
        heading: 'Day two — rehearse out loud',
        paragraphs: [
          'Answer the five or six questions you are most likely to get — out loud. Recording yourself once reveals filler words and rambling answers instantly.',
        ],
      },
      {
        heading: 'Day three — logistics and questions',
        paragraphs: [
          'Prepare three thoughtful questions to ask, test your camera or transit route, and plan what to wear. Ironing out logistics removes two-thirds of the nerves.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'interview-tips-that-stand-out',
    category: 'interviews',
    title: 'Seven Interview Tips That Help You Stand Out',
    excerpt:
      'Small, deliberate choices — before, during, and after the chat — separate memorable candidates from forgettable ones.',
    tone: 1,
    icon: 'lightbulb',
    author: 'David Mensah',
    role: 'Hiring Lead',
    date: 'Jul 30, 2026',
    readTime: '4 min read',
    intro:
      'You rarely win an interview on a single brilliant answer. You win on consistency — a dozen small signals that say "prepared, dependable, and pleasant to work with."',
    sections: [
      {
        heading: 'Show up prepared',
        paragraphs: [
          'Have your resumé, examples, and questions ready. Arrive a few minutes early virtually or in person — never late, never more than five minutes early.',
        ],
      },
      {
        heading: 'Listen before you answer',
        paragraphs: [
          'Pause, reflect, then answer the question that was asked — not the one you prepared for. Interviewers notice candidates who truly listen.',
        ],
      },
      {
        heading: 'Bring receipts',
        paragraphs: [
          'Every claim is stronger with a concrete example. "I improved reporting" becomes "I cut weekly reporting from three hours to twenty minutes with an automated dashboard."',
        ],
      },
      {
        heading: 'Close with purpose',
        paragraphs: [
          'Before you leave, say succinctly why you want the role and what you would bring. A confident, honest close stays in the interviewer\u2019s memory when the discussion round starts.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'choosing-the-right-career',
    category: 'growth',
    title: 'Choosing the Right Career (Not the Loudest One)',
    excerpt:
      'A good career fits your skills, energy, and values — not just the highest salary. Here is a practical filter.',
    tone: 3,
    icon: 'signpost-split',
    author: 'Tunde Adeyemi',
    role: 'Career Coach',
    date: 'Sep 5, 2026',
    readTime: '6 min read',
    intro:
      'Careers are long, and interests change. Rather than chasing the loudest trend, filter options through three stable lenses: what you are good at, what energises you, and what you value in a work life.',
    sections: [
      {
        heading: 'Skill — can you get good at this?',
        paragraphs: [
          'Look for a field where your natural strengths give you a head start and where there is room to invest deliberately. Both talent and practice matter; neither is enough alone.',
        ],
      },
      {
        heading: 'Energy — what drains you?',
        paragraphs: [
          'Track the tasks you lose track of time doing versus the ones you procrastinate. Energy is a reliable compass that pays are not.',
        ],
      },
      {
        heading: 'Values — what do you refuse to trade?',
        paragraphs: [
          'Remote flexibility, deep craft, public impact, stable routine — decide your non-negotiables before you compare offers. Money buys comfort; values keep you satisfied.',
        ],
      },
      {
        heading: 'Test before you commit',
        paragraphs: [
          'Shadow a day, take a small contract, volunteer, or interview three people in the field. A small experiment beats a large bet on guesses.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'building-professional-skills',
    category: 'growth',
    title: 'A Realistic Plan for Building Professional Skills',
    excerpt:
      'Skill building fails when it is vague. Give yourself constraints, a feedback loop, and a deadline you can actually hit.',
    tone: 2,
    icon: 'diagram-3',
    author: 'Tunde Adeyemi',
    role: 'Career Coach',
    date: 'Aug 18, 2026',
    readTime: '5 min read',
    intro:
      'Learning is motivating until it collides with a busy week. These four techniques make skill-building concrete enough to survive real life.',
    sections: [
      {
        heading: 'Pick one skill at a time',
        paragraphs: [
          'A six-month focus on one skill outperforms three rushed two-month attempts. Write the skill down, name the outcome you want, and give it a deadline.',
        ],
      },
      {
        heading: 'Use real projects as the classroom',
        paragraphs: [
          'Ship something small and real instead of only taking courses. A finished project — a site, an analysis, a process — teaches and produces evidence for your resumé at once.',
        ],
      },
      {
        heading: 'Build a feedback loop',
        paragraphs: [
          'Books and tutorials provide input, not feedback. Join a community, find a mentor, or publish your work so someone with more experience can correct your direction early.',
        ],
      },
      {
        heading: 'Block time like a doctor\u2019s appointment',
        paragraphs: [
          'Schedule 30 focused minutes most days and protect them. Consistency at low intensity beats heroic marathons that stop after two weeks.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
  {
    slug: 'growing-your-career',
    category: 'growth',
    title: 'Growing Your Career Without Burning Out',
    excerpt:
      'Growth is a marathon with sprints in it. These practices keep you moving forward without trading your life away.',
    tone: 1,
    icon: 'rocket-takeoff',
    author: 'Amara Okafor',
    role: 'Senior Recruiter',
    date: 'Jul 22, 2026',
    readTime: '5 min read',
    intro:
      'Career growth is not a single lucky break. It is a set of repeatable habits that compound — exposure, feedback, and visible impact — sustained without sacrificing your wellbeing.',
    sections: [
      {
        heading: 'Own an area of the business',
        paragraphs: [
          'Ask to own a process, a metric, or a project end to end. Ownership is the fastest way to earn visibility and promotion-worthy stories.',
        ],
      },
      {
        heading: 'Ask for feedback on purpose',
        paragraphs: [
          'Once a quarter, ask your manager two questions: what should I do more of, and what should I stop or delegate. Specific feedback beats annual reviews.',
        ],
      },
      {
        heading: 'Make your work visible',
        paragraphs: [
          'Share wins in meetings and write-ups so your impact is not assumed. Consistently visible work keeps your name in the conversation when roles open up.',
        ],
      },
      {
        heading: 'Protect rest like a deliverable',
        paragraphs: [
          'Sustained growth depends on recovery. Guard your evenings, take your leave, and treat burnout avoidance as part of the plan — not a side note.',
        ],
      },
    ],
    ctaTitle: 'Ready to put your CV to work?',
    ctaText: 'Create a profile and start applying to roles that fit you.',
  },
]

export const ARTICLE_CATEGORY_LABEL = {
  resume: 'Resume & CV',
  interviews: 'Interviews',
  growth: 'Career Growth',
}

export const FAQ = [
  {
    group: 'job-seekers',
    groupLabel: 'For Job Seekers',
    items: [
      {
        q: 'How do I apply for a job?',
        a: 'Search or browse jobs, open the one you like, and click Apply Now. You can apply directly with your HireHub profile and attached CV.',
      },
      {
        q: 'Can I upload my CV?',
        a: 'Yes. From your profile, add your resumé under Resume / CV. It is attached to your applications automatically and is available when you apply.',
      },
      {
        q: 'How do I track my application?',
        a: 'Open My Applications to see the live status of every application — from submitted, through review and shortlist, to interview and offer.',
      },
      {
        q: 'How do I save a job?',
        a: 'Click the bookmark icon on any job card or on the job details page. Saved jobs live under Saved Jobs, ready for you to apply later.',
      },
      {
        q: 'Is creating a profile free?',
        a: 'Yes. Creating a job-seeker profile is completely free, and you can apply to jobs, save roles, and track your applications at no cost.',
      },
    ],
  },
  {
    group: 'employers',
    groupLabel: 'For Employers',
    items: [
      {
        q: 'How do I post a job?',
        a: 'From the employer dashboard, choose Post a New Job, fill in the role details, and publish. Your listing goes live immediately.',
      },
      {
        q: 'How do I manage applicants?',
        a: 'Open Applicants to review every application in one place. Use the filters and pipeline to move candidates from new to review, shortlist, interview, offer, or hired.',
      },
      {
        q: 'How do I contact candidates?',
        a: 'Open a candidate profile and choose Contact Candidate. You can message them directly about interviews, offers, and next steps.',
      },
      {
        q: 'How do I manage my company profile?',
        a: 'Go to Your Company Profile to update your logo, description, culture, benefits, and open positions. It is the public face candidates see.',
      },
      {
        q: 'Can I track my hiring pipeline?',
        a: 'Yes. The Applicant Tracking view shows every candidate on the pipeline — Applied, Under Review, Shortlisted, Interview, Offer, and Hired — with the ability to move them forward.',
      },
    ],
  },
]