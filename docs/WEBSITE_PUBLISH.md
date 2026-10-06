# sougetsustore.com - build, publish, update

`website/` is the whole site (static files):
- `index.html` - the landing page (built by `tools/build_site.py` from `docs/website_original_v5.html`)
- `panel/` - the real panel in browser-preview mode (built by `tools/build_site_panel.py` from `client/`; no host scripts,
  no pixel characters, 8 demo sounds; `panel/preview.js` stands in for After Effects)
- `assets/`, `favicon.svg`, `og-image.png`, `robots.txt`, `sitemap.xml`

Rebuild after changing the panel or the page: `python3 tools/build_site_panel.py && python3 tools/build_site.py`

## Settings (top of tools/build_site.py, or the CONFIG block in website/index.html)
- `CHECKOUT` - Dodo payment link (regular price, $89)
- `SALE_ENDS` - when the $49.99 launch price ends (UTC). Publish 18 h before this time. After it, the page shows $89.
- `SALE_CHECKOUT_URL` (page CONFIG) - the Dodo link that charges $49.99. Until you create one it equals the regular
  link, so set the product price in Dodo to $49.99 for the sale window (or paste a $49.99 link here).

## Publish on Cloudflare Pages (free)
1. dash.cloudflare.com > Workers & Pages > Create > Pages > Upload assets.
2. Project name `sougetsustore`, drag the `website` folder, Deploy -> `sougetsustore.pages.dev`.
3. Project > Custom domains > add `sougetsustore.com` and `www.sougetsustore.com` (after the DNS step).
4. Updates: Create new deployment > drag the folder again.
