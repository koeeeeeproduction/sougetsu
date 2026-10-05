import os
import sys
import json
import argparse
import warnings


warnings.filterwarnings("ignore")

























DEFAULT_NEGATIVE = (
    "text, letters, words, watermark, signature, blurry, noisy, grainy, "
    "jpeg artifacts, low quality, deformed, cropped, frame, border"
)


def emit(kind, payload):

    sys.stdout.write(kind + " " + json.dumps(payload) + "\n")
    sys.stdout.flush()


def pick_device(requested):
    import torch
    if requested:
        return requested
    if torch.cuda.is_available():
        return "cuda"
    try:
        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def snap(value, default):

    try:
        v = int(value)
    except (TypeError, ValueError):
        return default
    if v <= 0:
        return default
    v = max(256, min(1024, v))
    return v - (v % 8)


def load_pipeline(model_id, device, steps):
    import torch
    from diffusers import AutoPipelineForText2Image, StableDiffusionPipeline

    torch_dtype = torch.float16 if device in ("cuda", "mps") else torch.float32
    turbo = ("turbo" in model_id.lower()) or ("lcm" in model_id.lower())

    if turbo:
        pipeline = AutoPipelineForText2Image.from_pretrained(
            model_id, torch_dtype=torch_dtype, safety_checker=None
        )
        if steps <= 0:
            steps = 4
        guidance = 0.0
    else:
        pipeline = StableDiffusionPipeline.from_pretrained(
            model_id, torch_dtype=torch_dtype, safety_checker=None
        )
        if steps <= 0:
            steps = 25
        guidance = 7.5

    pipeline.to(device)
    pipeline.set_progress_bar_config(disable=True)
    return pipeline, steps, guidance


MIN_CUTOUT_COVERAGE = 0.12


def cut_out(path):


















    from rembg import remove
    from PIL import Image
    img = Image.open(path).convert("RGBA")
    out = remove(img)

    alpha = out.split()[-1]
    total = alpha.width * alpha.height
    kept = sum(1 for v in alpha.getdata() if v > 32)
    coverage = (float(kept) / total) if total else 0.0

    if coverage < MIN_CUTOUT_COVERAGE:
        emit("WARN", {"path": path, "coverage": round(coverage, 4),
                      "message": "cut-out kept only %.0f%% of the image; "
                                 "no clear subject, keeping the opaque render"
                                 % (100.0 * coverage)})
        return False

    out.save(path)
    return True


def generate_one(pipeline, steps, guidance, item, transparent_default=False):
    prompt = item.get("prompt") or ""
    output = item.get("output")
    negative = item.get("negative") or DEFAULT_NEGATIVE
    width = snap(item.get("w"), 512)
    height = snap(item.get("h"), 512)
    transparent = item.get("transparent", transparent_default)

    image = pipeline(
        prompt,
        negative_prompt=negative,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=width,
        height=height,
    ).images[0]

    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    image.save(output)

    if transparent:


        try:
            cut_out(output)
        except Exception as e:
            emit("WARN", {"id": item.get("id"), "message": "Transparency skipped: " + str(e)})

    return {"id": item.get("id"), "path": output, "w": width, "h": height}


def cut_rects(manifest_path):
















    from rembg import remove, new_session
    from PIL import Image

    with open(manifest_path, "r") as fh:
        job = json.load(fh)

    src = Image.open(job["source"]).convert("RGB")
    W, H = src.size
    out_dir = job["outDir"]
    prefix = job.get("prefix", "akiracut")
    os.makedirs(out_dir, exist_ok=True)


    session = new_session("u2net")

    mask = Image.new("L", (W, H), 0)
    results = []

    for index, r in enumerate(job.get("rects", [])):
        x = max(0, int(r["x"])); y = max(0, int(r["y"]))
        x1 = min(W, int(r["x"] + r["w"])); y1 = min(H, int(r["y"] + r["h"]))
        if x1 - x < 2 or y1 - y < 2:
            continue

        crop = src.crop((x, y, x1, y1))
        cut = remove(crop.convert("RGBA"), session=session)
        alpha = cut.split()[-1]

        total = alpha.width * alpha.height
        kept = sum(1 for v in alpha.getdata() if v > 32)
        coverage = (float(kept) / total) if total else 0.0




        panel = coverage < 0.04 or coverage > 0.93
        if panel:
            cut = crop.convert("RGBA")
            emit("PANEL", {"key": r.get("key"), "coverage": round(coverage, 3)})
        else:
            mask.paste(alpha, (x, y))

        name = "%s-%d.png" % (prefix, index)
        path = os.path.join(out_dir, name)
        cut.save(path)
        results.append({"key": r.get("key"), "path": path, "name": name,
                        "x": x, "y": y, "w": x1 - x, "h": y1 - y,
                        "coverage": round(coverage, 3), "panel": panel})
        emit("RESULT", results[-1])

    mask_name = "%s-mask.png" % prefix
    mask_path = os.path.join(out_dir, mask_name)
    mask.save(mask_path)
    emit("MASK", {"path": mask_path, "w": W, "h": H})
    emit("DONE", {"cuts": len(results)})


def main():
    parser = argparse.ArgumentParser(description="Local Image Generation via Diffusers")
    parser.add_argument("--prompt", help="Text prompt for image generation")
    parser.add_argument("--output", help="Output image file path")
    parser.add_argument("--batch", help="Path to a JSON manifest of images to generate")
    parser.add_argument("--cutout", help="Cut the subject out of an existing image, in place")
    parser.add_argument("--cutrects", help="Path to a JSON manifest of regions to cut out of a reference")
    parser.add_argument("--model", default="stabilityai/sd-turbo", help="HuggingFace model ID")
    parser.add_argument("--steps", type=int, default=0, help="Number of inference steps")
    parser.add_argument("--negative", default=None, help="Negative prompt")
    parser.add_argument("--width", type=int, default=512, help="Image width")
    parser.add_argument("--height", type=int, default=512, help="Image height")
    parser.add_argument("--transparent", action="store_true", help="Cut the subject out onto alpha")
    parser.add_argument("--device", default=None, help="Device to run on (cuda, mps, cpu)")
    args = parser.parse_args()

    if args.cutrects:
        try:
            cut_rects(args.cutrects)
        except Exception as e:
            print("Error: region cut-out failed: " + str(e), file=sys.stderr)
            sys.exit(1)
        return

    if args.cutout:



        try:
            applied = cut_out(args.cutout)
        except Exception as e:
            print("Error: cut-out failed: " + str(e), file=sys.stderr)
            sys.exit(1)
        emit("DONE", {"cutout": args.cutout, "applied": bool(applied)})
        return

    if not args.batch and not (args.prompt and args.output):
        print("Error: pass --batch, --cutout, or both --prompt and --output.", file=sys.stderr)
        sys.exit(2)

    try:
        import torch
        from diffusers import AutoPipelineForText2Image, StableDiffusionPipeline
    except ImportError as e:
        print(f"Error: Missing dependency: {str(e)}", file=sys.stderr)
        print("Please install required libraries: pip install torch diffusers transformers accelerate", file=sys.stderr)
        sys.exit(1)

    model_id = args.model

    if args.batch:
        try:
            with open(args.batch, "r") as fh:
                manifest = json.load(fh)
        except Exception as e:
            print(f"Error: cannot read batch manifest: {str(e)}", file=sys.stderr)
            sys.exit(2)
        items = manifest.get("items") or []
        model_id = manifest.get("model") or model_id
        steps_req = int(manifest.get("steps") or args.steps or 0)
    else:
        items = [{
            "id": "single",
            "prompt": args.prompt,
            "output": args.output,
            "negative": args.negative,
            "w": args.width,
            "h": args.height,
            "transparent": args.transparent,
        }]
        steps_req = args.steps

    if not items:
        print("Error: nothing to generate.", file=sys.stderr)
        sys.exit(2)

    device = pick_device(args.device)
    print(f"Using device: {device}")
    print(f"Loading model: {model_id} (first run will download model weights)...")
    sys.stdout.flush()

    try:
        pipeline, steps, guidance = load_pipeline(model_id, device, steps_req)
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        sys.exit(1)

    print(f"Generating {len(items)} image(s) with {steps} steps...")
    sys.stdout.flush()

    results = []
    failed = 0
    for index, item in enumerate(items):
        emit("PROGRESS", {"index": index + 1, "total": len(items), "id": item.get("id")})
        try:
            results.append(generate_one(pipeline, steps, guidance, item))
            emit("RESULT", results[-1])
        except Exception as e:

            failed += 1
            emit("FAILED", {"id": item.get("id"), "message": str(e)})

    emit("DONE", {"generated": len(results), "failed": failed})

    if not results:
        print("Error: every image failed to generate.", file=sys.stderr)
        sys.exit(1)


    if not args.batch:
        print(f"Success: Image saved to {items[0]['output']}")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
