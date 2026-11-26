"""Create review-only, solid-background candidates from catalog source photographs."""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]


def catalog_images(root):
    models = json.loads((root / "src/data/models.json").read_text(encoding="utf-8"))
    names = set()
    for model in models:
        records = [model, *model.get("gallery", [])]
        for variant in model.get("variants", []):
            records.extend(variant.get("gallery", []))
        for record in records:
            name = record.get("image")
            if name:
                if not re.fullmatch(r"/[A-Za-z0-9_.-]+\.webp", name):
                    raise ValueError(f"Unexpected catalog source path: {name}")
                names.add(name[1:])
    if not names:
        raise ValueError("No catalog source images found")
    for name in names:
        source = root / "public" / name
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Missing or unsafe source: {name}")
    return sorted(names)


def composite(source, mask, colour):
    if mask.size != source.size:
        raise ValueError("Mask dimensions do not match the source")
    source = source.convert("RGB")
    # Keep fully selected original pixels; do not generate or retouch garment details.
    mask = mask.convert("L").point(lambda x: 0 if x <= 8 else 255 if x >= 247 else x)
    return Image.composite(source, Image.new("RGB", source.size, colour), mask), mask


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contact_sheet(rows, source_dir, candidate_dir, path):
    sheet = Image.new("RGB", (840, 292 * len(rows)), "#FFFFFF")
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(rows):
        y = index * 292
        draw.text((10, y + 5), name, fill="#222222")
        for column, (folder, label) in enumerate(((source_dir, "Original"), (candidate_dir, "Candidate"))):
            with Image.open(folder / name) as image:
                thumbnail = ImageOps.contain(image.convert("RGB"), (400, 246))
            x = column * 420
            draw.text((x + 10, y + 24), label, fill="#222222")
            sheet.paste(thumbnail, (x + (420 - thumbnail.width) // 2, y + 42))
    sheet.save(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--colour", default="#EFE4D2")
    parser.add_argument("--limit", type=int, default=0, help="Optional pilot image count")
    args = parser.parse_args()
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", args.colour) or args.limit < 0:
        parser.error("Use a six-digit hex colour and a nonnegative limit")
    output = args.output.resolve()
    public = (ROOT / "public").resolve()
    if output == public or public in output.parents or output.exists():
        parser.error("Output must be a new directory outside the public directory")

    names = catalog_images(ROOT)
    selected = names[:args.limit] if args.limit else names
    from rembg import new_session, remove
    session = new_session("u2net", providers=["CPUExecutionProvider"])
    candidates = output / "candidates"
    sheets = output / "review"
    candidates.mkdir(parents=True)
    sheets.mkdir()
    report = []
    successful = []
    for name in selected:
        path = public / name
        row = {"file": name, "original_sha256": sha(path), "status": "needs_visual_review"}
        try:
            with Image.open(path) as raw:
                source = raw.convert("RGB")
            mask = remove(source, session=session, only_mask=True)
            result, alpha = composite(source, mask, args.colour)
            histogram = alpha.histogram()
            foreground = sum(histogram[128:]) / (source.width * source.height)
            row.update({"dimensions": list(source.size), "foreground_fraction": round(foreground, 4),
                        "flag": "extreme_mask_coverage" if foreground < 0.04 or foreground > 0.96 else None})
            target = candidates / name
            result.save(target, "WEBP", lossless=True, method=4)
            with Image.open(target) as saved:
                if saved.size != source.size:
                    raise ValueError("Candidate dimensions changed")
            row["candidate_sha256"] = sha(target)
            successful.append(name)
        except Exception as error:
            (candidates / name).unlink(missing_ok=True)
            row.update({"status": "failed", "error": str(error)})
        report.append(row)
        print(f"{row['status']}: {name}", flush=True)

    for index in range(0, len(successful), 4):
        contact_sheet(successful[index:index + 4], public, candidates,
                      sheets / f"sheet-{index // 4 + 1:03}.png")
    (output / "manifest.json").write_text(json.dumps({
        "colour": args.colour.upper(), "catalog_source_count": len(names),
        "processed_count": len(selected), "candidate_count": len(successful),
        "requires_visual_review": True, "images": report
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(successful)}/{len(selected)} candidates; no source files were changed.")
    if len(successful) != len(selected):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
