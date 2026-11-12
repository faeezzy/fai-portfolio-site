# Fai Portfolio — "Follow the Line"

Static site, no build step.

```
index.html          page content
css/style.css       all styles (colors are the tokens at the top)
js/main.js          animations: track + robot, AprilTag cube, detection cursor, scroll reveals
assets/images/      project screenshots and photos
assets/favicon.svg  tab icon
```

Libraries load from cdnjs: GSAP 3.12.5 (+ ScrollTrigger, MotionPathPlugin) and three.js r128.

## Run locally
Open with VS Code's **Live Server** extension (right-click index.html → Open with Live Server),
or run `npx serve .` in this folder.

## Deploy
- GitHub + Vercel: push this folder to a repo → vercel.com → Add New → Project → Framework: Other → Deploy.
- Or from this folder: `npx vercel` (preview), then `npx vercel --prod`.
