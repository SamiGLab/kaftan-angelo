# Solid catalog photography background — review process

Target: a single warm cream colour, `#EFE4D2`, for all model photos, including back views and colour variants. The source list is derived from `src/data/models.json` (including hidden catalog records and accessories); hero banners and shop photographs are excluded.

This is a candidate-generation tool, not a live site change. It uses a local foreground segmentation model (U2-Net via rembg); the original garment is not generatively redrawn. Fully selected pixels and original dimensions are retained. Automatic masks can still remove fur, light garments, straps or fine details or retain background areas; every photo needs human visual review. In particular, do not approve masks solely on the reported coverage fraction. No existing public image or data record is overwritten by the preview.

## Run locally

Use Python 3.11 in an isolated virtual environment:

```sh
python -m pip install 'rembg[cpu]==2.0.67'
python _dev/scripts/catalog-background-preview.py --output /tmp/catalog-background-review
```

The first run downloads the segmentation model; processing happens locally. Use a fresh output directory for each run. Optional `--limit 8` creates a pilot.

Review `manifest.json`, the before/after contact sheets under `review/`, and full-resolution candidates under `candidates/`. The GitHub Actions preview is read-only and uploads these files as an artifact; it does not deploy or commit the results.

## After visual approval

Only copy approved candidate WebP files to their matching original filenames in a separate review branch. Compare the source SHA-256 from the manifest first; skip stale or unapproved files. Keep the original framing and verify details, fabric colour, edges, variants and dimensions. Restore or manually mask failed candidates rather than publishing inaccurate images. Delete responsive derivatives for replaced sources only (matching the source stem and width under `public/assets/images/`), then run `npm run optimize:images` and `npm run build`. Run existing responsive image, model inquiry, colour variant and collection gallery tests; inspect HU/EN product and collection views on mobile and desktop. Publish only after review and normal quality checks. No customer-facing text changes are required.
