# TEMPORARY: PROJECT BLUE 10.12

- Runs on the homepage only during October 12, 2026 in the Asia/Manila timezone. It turns off at midnight on October 13 without another deployment. The date check happens after hydration.
- Before October 12, run `npm run dev` and visit `http://localhost:3000/?projectBluePreview=1` to preview it. The preview query parameter does **not** work in production and cannot reactivate the event after October 12.
- Remove after the event: delete `src/app/ProjectBlueEasterEgg.tsx`, `src/app/ProjectBlueEasterEgg.date.ts`, and `src/app/ProjectBlueEasterEgg.module.css`. Remove the two `TEMPORARY: PROJECT BLUE 10.12` lines (the import and component placement) from `src/app/HomeClient.tsx`. Then delete this file. No other homepage, Firebase, or theme changes are necessary.
