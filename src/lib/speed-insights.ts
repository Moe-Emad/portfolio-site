// Vercel Speed Insights (tracker F28): the Core Web Vitals of real visits to the live site, per page, in the
// dashboard of the host. Its script lives at /_vercel/speed-insights/script.js, an address only Vercel serves, so
// it starts only in the build Vercel makes for production; the dev server, the test build, previews and any other
// host load nothing. The package comes in a small file of its own after the page, so the first view does not wait.

type SpeedInsightsPackage = { injectSpeedInsights: () => unknown };

/**
 * Starts Speed Insights when the site was built by Vercel for production, and says whether it did. `vercelEnv` is
 * the VERCEL_ENV of the build ('' when not built by Vercel). Browser only.
 */
export function startSpeedInsights(
  vercelEnv: string,
  load: () => Promise<SpeedInsightsPackage> = () => import('@vercel/speed-insights'),
): boolean {
  if (vercelEnv !== 'production') return false;
  load()
    .then(({ injectSpeedInsights }) => injectSpeedInsights())
    // A blocked or failed download only means this visit is not measured; the page itself is not affected.
    .catch(() => {});
  return true;
}
