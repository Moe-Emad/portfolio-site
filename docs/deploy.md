# Deploy guide

How to put the site online, and what to check before and after. The site is a folder of plain files (`dist/`):
every page is its own HTML file, so any static host can serve it. There is no server of our own and no database.

Commands are for Windows PowerShell, one line each.

## 1. Where to host it

All three below build the site from the GitHub repository on every push to `main` and give it HTTPS for free.
The figures come from comparison articles read on 2026-11-17, not from the providers' own pages: confirm them on
the pricing page of the one you pick, because free plans change.

| Host | Free plan, as read on 2026-11-17 | Fits this site? |
|---|---|---|
| **Cloudflare Pages** (recommended) | Traffic for static files is not metered; about 500 builds a month; custom domains; commercial use allowed | Yes. A portfolio is static files only, and there is no bill to fear when a post about you is shared widely |
| Netlify | A monthly allowance of credits (300 were named); when it runs out, the sites are paused until the next month; commercial use allowed | Yes, but a paused site at the wrong moment is a real risk |
| Vercel (Hobby) | About 100 GB of traffic a month; **non-commercial use only** | Only while the site does not sell anything. If it advertises paid freelance work, read their terms first |

Sources: [hostfleet comparison, April 2026](https://hostfleet.pages.dev/cf-pages-vs-vercel-vs-netlify-2026/),
[dev.to comparison with numbers](https://dev.to/lazydev_oh/vercel-vs-netlify-vs-cloudflare-pages-2026-deep-comparison-with-real-numbers-8pl),
[cmaven on the real limits for personal users](https://cmaven.github.io/en/hosting/netlify-vercel-static-hosting-comparison/).

The repository is public. Each host connects through its GitHub app, and you choose which repositories the app
may read: give it this one only.

Any other static host works too (GitHub Pages, a shared web space): upload the contents of `dist/`.

## 2. Before the first deploy

1. **Decide the address.** Either the free one the host gives (`<name>.pages.dev`) or your own domain. You need
   it for step 3 of the next section.
2. **EmailJS.** The three EmailJS values are part of the JavaScript every visitor downloads. They are not
   passwords, but anyone can copy them and send mail through your account until you limit where they may be used:
   - In the [EmailJS dashboard](https://dashboard.emailjs.com) open **Domains** and add the address of the site.
     EmailJS then refuses requests from anywhere else
     ([EmailJS: Can I add my domain to the allowlist?](https://www.emailjs.com/docs/faq/can-i-add-my-domain-to-allowlist/)).
     One review says this needs a paid plan; if the free plan does not offer it, do the next two points and watch
     the monthly count.
   - In the e-mail template, set the recipient to your own address as fixed text, never to a field of the form.
     Then a stranger can only send mail to you.
   - **Give the site a public key of its own** (Account, API keys), so it can be replaced at any time without
     touching anything else, and use it in the settings of the host.
3. **Run every check once more.**

   ```powershell
   npm run gate
   ```

   ```powershell
   npm run test:browser
   ```

4. **Look at the built site** the way a visitor will get it.

   ```powershell
   npm run build
   ```

   ```powershell
   npm run preview
   ```

## 3. Deploy on Cloudflare Pages

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com), open **Workers & Pages**, **Create**, **Pages**,
   **Connect to Git**, and pick `Moe-Emad/portfolio-site`.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

3. Environment variables (Settings, Environment variables, for Production):

   | Name | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `VITE_SITE_URL` | The address of the site without a closing slash, for example `https://mohammedemad.pages.dev` |
   | `VITE_APP_EMAILJS_SERVICE_ID` | From the EmailJS dashboard |
   | `VITE_APP_EMAILJS_TEMPLATE_ID` | From the EmailJS dashboard |
   | `VITE_APP_EMAILJS_PUBLIC_KEY` | The public key of the site from step 2 |

   These are typed into the dashboard of the host. They are never written into a file of the repository.
4. **Save and Deploy.** The first build takes a minute or two. From now on every merge to `main` deploys by itself,
   and every pull request gets a preview address of its own.
5. **Your own domain** (optional): Custom domains, Set up a domain, and follow the two DNS steps. Then change
   `VITE_SITE_URL` to the new address and deploy again, so the sitemap and the link previews use it.

The file `public/_headers` is read by Cloudflare Pages (and Netlify): it sets the security headers and lets the
browser keep the files in `assets/` for a year, which is safe because their names change with their content.

## 4. After every deploy: the checklist

Tick each line on the live address.

- [ ] The home page opens, in the light and in the dark theme (the button in the bar).
- [ ] On a phone: the Menu button opens and closes, nothing is wider than the screen.
- [ ] Every project in "Selected work" opens its page, and "All work" leads back.
- [ ] An address that does not exist (add `/nothing` to the address) shows "This page does not exist".
- [ ] The contact form: send yourself a message. The confirmation appears and the mail arrives.
- [ ] `https://<address>/sitemap.xml` lists the pages with the real address, not `localhost` and not an example.
- [ ] `https://<address>/robots.txt` names that sitemap.
- [ ] Paste the address into a chat with yourself (WhatsApp, LinkedIn message): the preview shows the blue picture
      with the name, the title and the description. For LinkedIn, the
      [Post Inspector](https://www.linkedin.com/post-inspector/) shows what it reads.
- [ ] View the source of the page (Ctrl+U): the text of the page is in it.
- [ ] No request to another server: open the developer tools (F12), Network, reload. Every line is your own
      address.

Once, after the first deploy:

- [ ] Add the site to [Google Search Console](https://search.google.com/search-console) and hand in the address of
      the sitemap.
- [ ] Put the address into your LinkedIn and GitHub profiles.
- [ ] In the settings of the repository on GitHub, switch on Dependabot security updates
      (Settings, Advanced Security).

## 5. Changing the content after it is online

Edit the file in `content/` (see the README, "Changing what the site says"), open a pull request, merge it. The
host builds and publishes the new version by itself, usually within two minutes.

## 6. Troubleshooting

| Symptom | Cause | What to do |
|---|---|---|
| The build fails on the host with "Unsupported engine" or a Node.js version error | The host uses an older Node.js | Set the environment variable `NODE_VERSION` to `22` and deploy again |
| The build fails with "Could not resolve ..." but works on the PC | A file name differs in upper and lower case; Linux is strict about it | Run `npm run test:tools`: the import test names the file. Fix the letter case |
| The build says "VITE_SITE_URL is not set" | The variable is missing on the host | Add it (section 3, step 3) and deploy again. Without it there is no sitemap and no picture in link previews |
| The contact form is replaced by a notice | One of the three EmailJS variables is missing on the host | Add all three and deploy again: they are read when the site is built, not when it runs |
| The contact form says the message could not be sent | EmailJS refused it: wrong value, or the address of the site is not in the Domains list | Compare the three values with the dashboard; add the live address under Domains |
| A link preview shows no picture, or an old one | The address in `VITE_SITE_URL` is wrong, or the service kept an old copy | Check `og:image` in the source of the page; then let the Post Inspector of LinkedIn fetch it again |
| A project page shows the home page or a blank page | The host serves `index.html` for every address instead of the files | Make sure the output directory is `dist` and no "single page app" rewrite is switched on |
| An old version stays after a deploy | The browser kept the page | Reload with Ctrl+F5. The HTML is never kept for long; only the files in `assets/` are |

## 7. Rolling back

Every deploy stays in the list of the host. In Cloudflare Pages: Deployments, pick the last good one, **Rollback to
this deployment**. Then fix the problem in a new pull request; never rewrite the history of `main`.
