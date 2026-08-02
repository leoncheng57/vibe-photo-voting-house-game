import type { ReactNode } from 'react'
import type { Challenge } from '../types'

function IllustrationArt({ slug }: { slug: string }) {
  let art: ReactNode

  switch (slug) {
    case 'dog-date':
      art = <>
        <circle className="illustration-fill--light" cx="194" cy="30" r="17" />
        <path d="M20 105h200M48 105V77h142v28M68 77V60M172 77V60" />
        <circle className="illustration-fill--paper" cx="75" cy="43" r="14" />
        <path className="illustration-fill--sky" d="M51 76c2-20 11-29 24-29s22 9 24 29z" />
        <path className="illustration-fill--paper" d="M139 48l-15-13 2 24c-6 6-9 14-9 24h52c0-10-4-19-10-25l2-23-15 13z" />
        <circle cx="137" cy="60" r="2" fill="currentColor" stroke="none" />
        <circle cx="153" cy="60" r="2" fill="currentColor" stroke="none" />
        <path d="M141 68c3 3 7 3 10 0M105 29c7-9 17 1 8 9l-8 7-8-7c-9-8 1-18 8-9z" />
      </>
      break
    case 'balcony':
      art = <>
        <circle className="illustration-fill--paper" cx="188" cy="31" r="18" />
        <path className="illustration-fill--light" d="M17 91V65h26v26V48h31v43V58h24v33V38h38v53V55h24v36V45h41v46h22v26H17z" />
        <path d="M18 91h204M27 91v30M66 91v30M105 91v30M144 91v30M183 91v30M222 91v30M18 106h204" />
        <path d="M29 59h7M51 58h15M51 68h15M82 68h8M109 49h18M109 60h18M109 71h18M168 57h25M168 68h25" />
        <path d="M23 35c8-8 16-8 24 0 8-8 16-8 24 0" />
      </>
      break
    case 'mirror':
      art = <>
        <path className="illustration-fill--paper" d="M68 118V49c0-28 19-39 52-39s52 11 52 39v69z" />
        <path className="illustration-fill--light" d="M83 105V51c0-18 13-27 37-27s37 9 37 27v54z" />
        <circle className="illustration-fill--paper" cx="119" cy="50" r="14" />
        <path className="illustration-fill--sky" d="M91 105c3-32 13-46 28-46 17 0 27 14 30 46z" />
        <rect className="illustration-fill--paper" x="135" y="51" width="15" height="23" rx="2" />
        <path d="M135 69l-16 12M99 73l-14-13M189 25v16M181 33h16M49 61v17M41 69h16M185 86l10 10M195 86l-10 10" />
        <circle cx="141" cy="57" r="1.5" fill="currentColor" stroke="none" />
      </>
      break
    case 'twins':
      art = <>
        <circle className="illustration-fill--paper" cx="78" cy="37" r="16" />
        <circle className="illustration-fill--paper" cx="162" cy="37" r="16" />
        <path className="illustration-fill--sky" d="M46 111V70c0-17 13-27 32-27s32 10 32 27v41zM130 111V70c0-17 13-27 32-27s32 10 32 27v41z" />
        <path d="M53 65h50M53 78h50M53 91h50M137 65h50M137 78h50M137 91h50M46 111h64M130 111h64M105 73l15 11 15-11" />
        <path d="M120 21l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" />
        <path d="M65 35c7 5 19 5 26 0M149 35c7 5 19 5 26 0" />
      </>
      break
    case 'food':
      art = <>
        <ellipse className="illustration-fill--paper" cx="120" cy="78" rx="75" ry="37" />
        <ellipse className="illustration-fill--light" cx="120" cy="78" rx="53" ry="24" />
        <path className="illustration-fill--sky" d="M88 79c7-29 20-42 39-42 17 0 28 14 34 42z" />
        <path d="M88 79h73M111 49c6 7 12 7 18 0M120 37V24M114 24h12M31 47v61M25 47v22M37 47v22M209 47v61M203 47h12M53 31l7 7M187 31l-7 7M78 17l4 10M162 17l-4 10" />
        <circle className="illustration-fill--paper" cx="128" cy="60" r="6" />
      </>
      break
    case 'candid':
      art = <>
        <path d="M28 49V24h25M187 24h25v25M28 83v25h25M212 83v25h-25" />
        <circle className="illustration-fill--paper" cx="82" cy="52" r="18" />
        <circle className="illustration-fill--paper" cx="161" cy="56" r="18" />
        <path className="illustration-fill--sky" d="M48 112c3-35 14-51 34-51s31 16 34 51zM128 112c3-32 14-47 33-47s30 15 33 47z" />
        <path d="M72 49l6 4 7-5M151 52l6 4 7-5M76 60c5 7 13 7 18 0M153 66c6-5 12-5 17 0" />
        <path className="illustration-fill--light" d="M113 12l18 8-9 12 17 6-31 18 7-17-14-7z" />
        <path d="M45 63l-14-8M198 69l14-7M84 17l-5-12M169 18l5-12" />
      </>
      break
    default:
      art = <>
        <path className="illustration-fill--paper" d="M57 43h34l8-13h42l8 13h34c11 0 19 8 19 19v42H38V62c0-11 8-19 19-19z" />
        <circle className="illustration-fill--sky" cx="120" cy="75" r="28" />
        <circle className="illustration-fill--paper" cx="120" cy="75" r="13" />
        <path d="M53 56h18M177 29v16M169 37h16" />
      </>
  }

  return <svg viewBox="0 0 240 132" aria-hidden="true">{art}</svg>
}

export function ChallengeIllustrations({ challenges }: { challenges: Challenge[] }) {
  return (
    <section className="challenge-illustrations" aria-labelledby="challenge-illustrations-title">
      <h2 className="visually-hidden" id="challenge-illustrations-title">The six photo challenges</h2>
      {challenges.map((challenge, index) => (
        <figure key={challenge.id} className={`challenge-illustration challenge-illustration--${(index % 3) + 1}`}>
          <div role="img" aria-label={`${challenge.title}: ${challenge.prompt}`}>
            <IllustrationArt slug={challenge.slug} />
          </div>
          <figcaption>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{challenge.title}</strong>
          </figcaption>
        </figure>
      ))}
    </section>
  )
}
