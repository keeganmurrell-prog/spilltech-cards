# Spill Tech contact cards

The page each business-card QR code opens: one page per person, with a "Save to contacts" button that serves a real `.vcf` file.

## Adding or changing someone

Edit `staff.json`, then redeploy (or push, if the repo is connected to Vercel).

- `slug` becomes the URL: `rowanne` → `/rowanne`. **Never change a slug once a card is printed.**
- `mobile` in international form: `+27821234567`.
- `linkedin` is optional; leave it `""` to hide the button.
- When someone leaves, set `"status": "retired"`. Their printed QR keeps working and shows the "no longer with us" page.

## Build

```
npm install
npm run build
```

- `public/` is the site Vercel serves.
- `print/qr/<slug>.svg` is the QR artwork for the printer (black on white, quiet zone included).

The QR codes encode `baseUrl` from `staff.json`. Set it to the final domain **before** sending artwork to print, or override it with `SITE_URL=https://card.spilltech.co.za npm run build`.
