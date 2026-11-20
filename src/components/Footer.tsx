import { content } from '../content/index.ts';

export default function Footer({ home }: { home: boolean }) {
  const { profile } = content;
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <p className="site-footer__name">
          {profile.name}
          <span lang="ar" dir="rtl">
            {profile.nameArabic}
          </span>
        </p>
        {/* The year is written when the site is built and corrected in the browser if it has changed since. */}
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} {profile.name}.
        </p>
        <ul>
          <li>
            <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </li>
          {profile.links.github && (
            <li>
              <a href={profile.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </li>
          )}
          <li>{home ? <a href="#top">Back to the top</a> : <a href="/">Home</a>}</li>
        </ul>
      </div>
    </footer>
  );
}
