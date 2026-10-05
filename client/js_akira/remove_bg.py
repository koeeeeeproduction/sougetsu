import os
import sys
import argparse
import subprocess





























PACKAGES = ["rembg", "pillow", "onnxruntime"]


def _run(cmd):

    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            universal_newlines=True)
        out, _ = proc.communicate()
        return proc.returncode == 0, (out or "")
    except Exception as exc:
        return False, str(exc)


def _ensure_pip():

    ok, _ = _run([sys.executable, "-m", "pip", "--version"])
    if ok:
        return True
    print("pip is missing — bootstrapping it with ensurepip...")
    sys.stdout.flush()
    ok, _ = _run([sys.executable, "-m", "ensurepip", "--upgrade"])
    return ok


def install_dependencies():
    print("Dependencies missing. Auto-installing 'rembg', 'pillow', and 'onnxruntime'...")
    sys.stdout.flush()

    if not _ensure_pip():
        print("Error: this Python has no pip and ensurepip could not add it. "
              "Install pip, or install Python from python.org.", file=sys.stderr)
        return False

    base = [sys.executable, "-m", "pip", "install"]




    attempts = [
        ("", base + PACKAGES),
        ("into your user site-packages", base + ["--user"] + PACKAGES),
        ("with --break-system-packages", base + ["--break-system-packages"] + PACKAGES),
        ("into your user site-packages, overriding the system policy",
         base + ["--user", "--break-system-packages"] + PACKAGES),
    ]

    last = ""
    for note, cmd in attempts:
        if note:
            print("Retrying %s..." % note)
            sys.stdout.flush()
        ok, out = _run(cmd)
        last = out
        if ok:
            print("Dependencies installed successfully!")
            sys.stdout.flush()
            return True

        low = out.lower()


        if "no matching distribution" in low or "could not find a version" in low:
            print("Error: no prebuilt package is available for Python %d.%d on this platform. "
                  "onnxruntime usually lags the newest Python by a few months — "
                  "install Python 3.11 or 3.12 and try again."
                  % (sys.version_info[0], sys.version_info[1]), file=sys.stderr)
            return False

        if not ("externally-managed-environment" in low
                or "externally managed" in low
                or "permission denied" in low
                or "access is denied" in low
                or "consider using" in low):
            break

    tail = "\n".join([ln for ln in last.strip().split("\n") if ln.strip()][-6:])
    print("Error: Failed to auto-install dependencies.\n%s" % tail, file=sys.stderr)
    return False



try:
    from PIL import Image
    import rembg
except ImportError:
    if install_dependencies():
        try:
            from PIL import Image
            import rembg
        except ImportError as e:
            print(f"Error: Imports still failed after installation: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="AI Background Image Remover using rembg")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output PNG image file path")
    parser.add_argument("--model", default="u2net", help="Model name to use (e.g. u2net, u2netp, isnet-general-use)")
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output

    if not os.path.exists(input_path):
        print(f"Error: Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading image: {input_path}")
    sys.stdout.flush()

    try:

        input_image = Image.open(input_path)





        if input_image.mode not in ("RGB", "RGBA"):
            input_image = input_image.convert("RGBA")

        print(f"Removing background using model '{args.model}' (the first run might take a moment to download)...")
        sys.stdout.flush()


        try:
            session = rembg.new_session(args.model)
        except Exception as session_error:



            print("Error: could not load the '%s' model (%s). The first run downloads it, "
                  "so this usually means no internet access or a firewall/proxy is blocking "
                  "the download." % (args.model, session_error), file=sys.stderr)
            sys.exit(1)

        output_image = rembg.remove(input_image, session=session)


        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)


        output_image.save(output_path, "PNG")

        print(f"Success: Background removed and saved to {output_path}")
        sys.stdout.flush()
        sys.exit(0)

    except Exception as e:
        print(f"Error removing background: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
