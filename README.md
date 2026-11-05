# Tarik Čolić · Portfolio

Personal portfolio site. Plain HTML, CSS and JavaScript with no build step, so GitHub Pages serves it as is.

Live: https://tarikcolic.github.io/portfolio/

## Deploy on GitHub Pages

1. Merge this branch into `main`.
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, then **Save**.
4. After a minute the site is live at `https://tarikcolic.github.io/portfolio/`.

To serve it at `https://tarikcolic.github.io/` instead, rename the repository to `tarikcolic.github.io` and update the URLs in the `<head>` of `index.html` (canonical, `og:url`, `og:image`, JSON-LD) and the two `/portfolio/` links in `404.html`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Use a local server rather than opening `index.html` directly: the volcano plot loads its data with `fetch`, which browsers block on `file://`.

## Structure

```
index.html                  all content
404.html                    not-found page for GitHub Pages
favicon.svg
assets/css/style.css        design tokens (light and dark) at the top, then components
assets/js/main.js           interactions, one isolated block per feature
assets/data/airway-volcano.json   780-gene subset of real DESeq2 results
assets/img/                 portrait, social preview image (og.jpg)
assets/Tarik_Colic_CV.pdf   downloadable CV
scripts/build_volcano_data.py     regenerates the volcano data
.nojekyll                   tells Pages to serve files without Jekyll
```

## Editing content

- Text, projects, experience and skills all live in `index.html`. Each project is an `<article class="project">`; its `data-cat` attribute (`web`, `science`, or both) controls the filters.
- Colors are CSS variables at the top of `style.css`. `--accent` is the cobalt from the CV.
- Replace `assets/Tarik_Colic_CV.pdf` to update the downloadable CV. Keep the filename or update the links.

## Notes

- Animations respect `prefers-reduced-motion`; all content is visible without JavaScript.
- The SEIRD chart re-solves the model from `covid19seird` in the browser (RK4, same parameters as the notebook).
- The volcano plot is drawn from the airway dataset results in `RNAseq-workshop`.
