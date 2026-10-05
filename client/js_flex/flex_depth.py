








import argparse
import json
import os
import sys
import tempfile
import urllib.request

MODEL_URL = "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx"
MODEL_NAME = "depth_anything_v2_small.onnx"
MODEL_BYTES = 99060839


def say(**kw):
    sys.stdout.write(json.dumps(kw) + "\n")
    sys.stdout.flush()


def default_model_dir():
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
        return os.path.join(base, "Flex", "models")
    return os.path.join(os.path.expanduser("~"), "Library", "Application Support", "Flex", "models")


def fetch_model(folder):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, MODEL_NAME)
    if os.path.exists(path) and os.path.getsize(path) == MODEL_BYTES:
        return path
    say(stage="download", progress=0)
    fd, tmp = tempfile.mkstemp(prefix="depth-", suffix=".part", dir=folder)
    os.close(fd)
    try:
        req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "FlexGUIPro"})
        with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as out:
            total = int(r.headers.get("Content-Length") or MODEL_BYTES)
            got, last = 0, -1
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                out.write(chunk)
                got += len(chunk)
                pct = int(got * 100 / max(total, 1))
                if pct != last and pct % 5 == 0:
                    say(stage="download", progress=pct)
                    last = pct
        if os.path.getsize(tmp) != MODEL_BYTES:
            raise RuntimeError("the model download was incomplete")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return path


def run(src, dst, model_dir, detail):
    try:
        import numpy as np
        from PIL import Image
        import onnxruntime as ort
    except Exception as e:
        say(ok=False, error="Python is missing onnxruntime / numpy / Pillow (" + str(e) + "). Use Install / Fix Dependencies in the Background Remover.")
        return 2

    model = fetch_model(model_dir)
    say(stage="scan", progress=0)

    img = Image.open(src)
    alpha = img.getchannel("A") if "A" in img.getbands() else None
    rgb = img.convert("RGB")
    w, h = rgb.size

    side = max(14, int(round(detail / 14.0)) * 14)
    scale = side / float(max(w, h))
    iw = max(14, int(round(w * scale / 14.0)) * 14)
    ih = max(14, int(round(h * scale / 14.0)) * 14)
    x = np.asarray(rgb.resize((iw, ih), Image.BICUBIC), dtype=np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None].astype(np.float32)

    sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    d = sess.run(None, {name: x})[0]
    d = np.squeeze(d).astype(np.float32)

    lo, hi = np.percentile(d, 1.0), np.percentile(d, 99.0)
    if hi - lo < 1e-6:
        hi = lo + 1e-6
    d = np.clip((d - lo) / (hi - lo), 0.0, 1.0)

    depth = Image.fromarray((d * 65535.0).astype(np.uint16))
    depth = depth.resize((w, h), Image.BICUBIC)
    if alpha is not None:
        a = np.asarray(alpha, dtype=np.float32) / 255.0
        v = np.asarray(depth, dtype=np.float32) * a
        depth = Image.fromarray(v.astype(np.uint16))

    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    depth.save(dst)
    say(ok=True, out=dst, width=w, height=h)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", dest="dst", required=True)
    ap.add_argument("--model-dir", default=default_model_dir())
    ap.add_argument("--detail", type=int, default=518)
    a = ap.parse_args()
    if not os.path.exists(a.src):
        say(ok=False, error="The frame to scan was not found: " + a.src)
        return 2
    try:
        return run(a.src, a.dst, a.model_dir, a.detail)
    except Exception as e:
        say(ok=False, error=str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
