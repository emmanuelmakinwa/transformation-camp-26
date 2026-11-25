# Transformation Camp 26 redesign preview

This is a self-contained local preview built from the public Transformation Camp 26 page. It uses the verified brand and product imagery, retains the current public messaging, four published testimonies, all involvement links and bank details, and includes a redesigned, responsive registration page.

## Run locally

From this directory, start the included local static preview server:

```powershell
node preview-server.mjs
```

Then open <http://127.0.0.1:4173> in a browser. Stop the server with `Ctrl+C`.

No install step or build tool is required. The pages use plain HTML, CSS and JavaScript. The official logo, hero, accommodation flyer and product images are stored in `assets/`; the Manrope font loads from Google Fonts, so an internet connection is needed for that font (the system sans-serif fallback works offline).

## Isolation and known limits

- This workspace was an empty Git repository on `master` with no commits, remote, app source, deployment settings, or environment files. There is no way here to establish the original production branch or hosting/auto-deploy rules.
- No push, deploy, production configuration change, external form submission, or production data change was performed.
- The rebuilt form is at `register.html`. Its fields and JSON payload match the public site's `/api/register` contract. In the local preview, form submission is deliberately disabled so personal details are not sent; the page links directly to the official form. On the Transformation Camp origin, it posts to that same-origin API and shows success only if the API returns a registration reference. The API cannot be exercised by this local static preview.
- The supplied accommodation flyer is used in the accommodation panel. Its white badge has had only the “02” removed; the rest of the artwork is retained. The hero camp flier is also used as the closing section background.
- Event dates, venue, speakers, and contact details beyond those published in the page were not available; none were added.
- The Reboot Camp reference page visibly opens on a dark, ember-lit scene with a blurred crowd image, a large centered headline, an orange emphasis, and a bordered “Yes, I’m ready” control. Its interface says “Sound on · about 15 seconds · skip any time,” and shows a 3–6 December 2026 National Stadium event line. I verified that opening frame and its text, but did not verify the intro's full timing or later transitions. This redesign uses its own identity and puts the registration CTA immediately on the first screen instead of reproducing the reference's timed intro.

## Motion and accessibility

The page uses a short hero image reveal, viewport-triggered section entrances, subtle hover feedback, a keyboard-operable mobile menu, and a manually controlled testimony carousel. `prefers-reduced-motion` removes nonessential movement and reveals content immediately. There is no scroll hijacking or continuous parallax.
