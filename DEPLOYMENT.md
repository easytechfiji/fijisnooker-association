# Deploying the site

Phase 6 of `PROJECT_PLAN.md`: the React app to Vercel or Netlify, the Namecheap
domain pointed at it, Supabase staying where it is.

Config for **both** hosts is committed — `vercel.json` and `netlify.toml`. Pick
one; the other file is inert.

---

## Before you deploy

- [ ] `schema.sql` has been run in Supabase — **done**, verified against the
      live project
- [ ] `storage.sql` has been run — **needed for media uploads**, see below
- [ ] `seed-content.sql` has been run, if you want the 2009–2011 archive
- [ ] You have added yourself to `admins` (see the README's bootstrap step)
- [ ] `npm run build`, `npm run lint` and `npm test` all pass locally

`storage.sql` is separate from `schema.sql` and has not been run yet. Until it
is, the admin panel's media uploads will fail — everything else works.

---

## 1. Push to GitHub

The repo has a remote already. If this is the first push:

```bash
git push -u origin main
```

Make sure `.env.local` is **not** in the push. It is gitignored, and
`git status` should never list it. If it ever appears, stop and remove it from
the index before pushing — the anon key is safe to expose, but the habit is
what protects you the day a different secret is in there.

## 2. Connect the host

### Vercel

1. **Add New → Project**, import the GitHub repo.
2. Framework preset: **Vite**. Build command and output directory come from
   `vercel.json`, so leave them alone.
3. Add the two environment variables (below), then **Deploy**.

### Netlify

1. **Add new site → Import an existing project**, pick the repo.
2. Build command and publish directory come from `netlify.toml`.
3. Add the two environment variables (below), then **Deploy**.

## 3. Environment variables

Set both in the host's dashboard, for **all** environments (production,
preview, development):

| Name                     | Value                                    |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | your project URL, same as `.env.local`   |
| `VITE_SUPABASE_ANON_KEY` | the **anon / publishable** key           |

Two things to be clear about:

- **`VITE_` variables are compiled into the JavaScript bundle.** They are
  public by definition. That is fine for the anon key, which is designed to be
  public and is constrained by Row Level Security. It is why the `service_role`
  key must never be set here — it bypasses RLS entirely, and putting it in a
  `VITE_` variable would publish full write access to your database to every
  visitor. The app refuses to start if it detects one, but do not rely on that.
- **Changing an environment variable requires a redeploy.** They are baked in
  at build time, not read at runtime.

## 4. Point the Namecheap domain

Deploy once on the host's default domain first and confirm the site works.
Then add the custom domain in the host dashboard **before** changing DNS — both
hosts need to know about the domain to issue the TLS certificate.

In Namecheap: **Domain List → Manage → Advanced DNS**.

Delete the parking-page records Namecheap adds by default (usually a
`CNAME` on `www` pointing at `parkingpage.namecheap.com`, and a URL-redirect
record on `@`). Leave any `MX` records alone if you use email on the domain.

### Vercel

| Type    | Host  | Value                   | TTL       |
| ------- | ----- | ----------------------- | --------- |
| A       | `@`   | `76.76.21.21`           | Automatic |
| CNAME   | `www` | `cname.vercel-dns.com.` | Automatic |

### Netlify

| Type    | Host  | Value                          | TTL       |
| ------- | ----- | ------------------------------ | --------- |
| A       | `@`   | `75.2.60.5`                    | Automatic |
| CNAME   | `www` | `<your-site>.netlify.app.`     | Automatic |

Confirm the current target IP in your host's dashboard rather than trusting
this table — both providers have changed these, and the dashboard is
authoritative.

Replace `@` and `www` with your actual domain's records — `PROJECT_PLAN.md`
says only that a Namecheap domain exists, not which one, so substitute it
throughout this section.

DNS propagation is usually minutes but can take up to 48 hours. Check with:

```bash
nslookup yourdomain.com
```

HTTPS is issued automatically by both hosts once DNS resolves. Do not add a
Namecheap-side redirect or SSL setting; let the host handle both.

## 5. After it is live

- [ ] Load the site over `https://` and confirm the certificate is valid
- [ ] Open a deep link **directly** — e.g. `/tournaments` typed into the
      address bar, not clicked from the home page — and confirm it loads rather
      than 404s. This is the single most common SPA deployment failure; the
      rewrite rules in `vercel.json` / `netlify.toml` are what prevent it, and
      they have been verified locally against the production build.
- [ ] Refresh on that deep link. Same check, different failure mode.
- [ ] Sign in at `/admin/login` and confirm the dashboard loads
- [ ] Add a tournament through the admin panel and confirm it appears on the
      public site — the end-to-end test `PROJECT_PLAN.md` phase 7 asks for
- [ ] Open the browser console and confirm there are no CSP violations

That last one matters because the deployed Content-Security-Policy is strict:
no inline scripts, no inline styles, and network requests only to your own
origin and `*.supabase.co`. The build currently contains neither inline
scripts nor inline styles, and that is checked, but if you later add a
third-party embed — a YouTube video, an analytics snippet, a web font from
Google — **it will be blocked** until you widen the policy in whichever config
file your host uses. A blocked resource logs a clear CSP violation in the
console; that is the policy working, not a bug.

---

## Redirecting the old WordPress blog

The migrated posts keep their original slugs, so old links map cleanly:

```
fijisnooker.wordpress.com/2010/01/31/deepak-bala-wins/
  → yourdomain.com/news/deepak-bala-wins
```

WordPress.com's paid Site Redirect upgrade can forward the whole domain. If
you would rather not pay for it, editing each post to link here works too —
there are only ten.

## Rolling back

Both hosts keep every previous deploy and can promote one back to production
from the dashboard in a few seconds. Nothing needs to be rebuilt, and no
database change is involved — the site is static files plus Supabase, so a
rollback of the app never touches your data.
