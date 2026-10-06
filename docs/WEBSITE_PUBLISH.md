# sougetsustore.com — publish & update

Site files: `website/` (index.html, favicon.svg, og-image.png, robots.txt, sitemap.xml). Rebuild after edits:
`python3 tools/build_site.py` (source design: `docs/website_original_v5.html`, panel demo: `tools/site/panel-demo.js`).

## Connect checkout
Open `website/index.html`, search for `const DODO_CHECKOUT_URL='DODO_CHECKOUT_URL';` and paste your Dodo payment link
(Dodo dashboard › Products › Sougetsu Akira FX › Share/Payment link). Test link first (`test.checkout.dodopayments.com`),
live link when you launch. (Also replace it in `tools/build_site.py` users? No — the build copies the JS line; edit the
same line in the built file or in `tools/build_site.py`'s JS_CHECKOUT block so a rebuild keeps it.)

## Publish on Cloudflare Pages (free)
1. dash.cloudflare.com › sign up › Workers & Pages › Create › Pages › **Upload assets**.
2. Project name `sougetsustore` › drag the `website` folder › Deploy. You get `sougetsustore.pages.dev`.
3. Project › Custom domains › Set up a domain › `sougetsustore.com` (repeat for `www.sougetsustore.com`).
4. DNS (see the walkthrough in chat): either move the domain's nameservers to Cloudflare (recommended) or add a CNAME
   at your registrar: `www` → `sougetsustore.pages.dev`, and for the bare domain use the registrar's forwarding to
   `https://www.sougetsustore.com` (or ALIAS/ANAME → `sougetsustore.pages.dev` if supported).
5. Updates: Pages project › Create new deployment › drag the folder again.
