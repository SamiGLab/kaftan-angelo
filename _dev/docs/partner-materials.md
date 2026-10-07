# Partner materials integration

The website reads `materials` from the existing `get_partner_portal(p_code, p_pin)` response. No desktop generator or database migration is deployed by this website change. Missing materials do not prevent login.

Return an array with up to four entries, one per `kind` (`print` or `mobile`) and `language` (`hu` or `en`):

```json
{
  "materials": [
    {
      "partner_code": "PARTNER-CODE",
      "kind": "print",
      "language": "hu",
      "pdf_url": "https://PROJECT.supabase.co/storage/v1/object/sign/partner-materials/PARTNER-CODE/print-hu.pdf?token=SIGNED_TOKEN",
      "png_url": "https://PROJECT.supabase.co/storage/v1/object/sign/partner-materials/PARTNER-CODE/print-hu.png?token=SIGNED_TOKEN"
    },
    {
      "partner_code": "PARTNER-CODE",
      "kind": "mobile",
      "language": "en",
      "png_url": "https://PROJECT.supabase.co/storage/v1/object/sign/partner-materials/PARTNER-CODE/mobile-en.png?token=SIGNED_TOKEN"
    }
  ]
}
```

`preview_url` is optional; when absent the PNG is used as preview. PDF and PNG URLs are independently optional. Only HTTPS links are accepted. Include `partner_code` to let the frontend reject mismatched entries, but enforce ownership on the backend: this check is not authorization.

Store files in a private bucket, with paths such as `PARTNER-CODE/print-hu.pdf`, `print-en.pdf`, `mobile-hu.png`, `mobile-en.png`. Upload using the desktop application's trusted backend credentials; never ship a service-role key in website JavaScript. Resolve material paths only for the partner identified by the validated RPC login. Supply fresh signed URLs from a trusted server/Edge Function when returning the response; do not save short-lived signed URLs as permanent file identifiers. Expired links require signing in again to obtain new URLs.

For absent files return no entry (or an entry without URLs); the corresponding card displays a preparation message. A preview load failure shows a recovery message without hiding available file links. Logging out removes material URLs and previews from the page.

Cross-origin file links open in a new tab: the browser's PDF viewer provides print/download, and images can be saved then attached to a private chat. The website deliberately does not use the native share sheet, which can include public posting destinations. It cannot control where someone manually shares a downloaded image.

The generator owns QR correctness, partner attribution, 10×15 cm print dimensions, and 9:16 image dimensions. The website only displays supplied files. Commission remains based on recorded completed sales, not QR scans.

Website verification: `npm run build:astro`, `npm run check:all`, `node _dev/scripts/test-partner-portal.mjs`.
