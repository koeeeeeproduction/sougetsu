import os
import sys
import argparse
import subprocess
import json

def install_dependencies():
    print("Dependencies missing. Auto-installing 'pillow' and 'numpy'...")
    sys.stdout.flush()
    try:
        cmd = [sys.executable, "-m", "pip", "install", "pillow", "numpy"]
        subprocess.check_call(cmd)
        print("Dependencies installed successfully!")
        sys.stdout.flush()
        return True
    except Exception as e:
        print(f"Error: Failed to auto-install dependencies: {str(e)}", file=sys.stderr)
        return False


try:
    from PIL import Image
    import numpy as np
except ImportError:
    if install_dependencies():
        try:
            from PIL import Image
            import numpy as np
        except ImportError as e:
            print(f"Error: Imports still failed after installation: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        sys.exit(1)

def load_frame(path):
    try:
        img = Image.open(path)
        img.verify()
        return Image.open(path)
    except Exception:
        try:
            import cv2
            cap = cv2.VideoCapture(path)
            if not cap.isOpened():
                raise ValueError("Cannot open file as image or video")
            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None:
                raise ValueError("Cannot read first frame of video")
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            return Image.fromarray(frame_rgb)
        except Exception as e:
            raise ValueError(f"Failed to load image/video: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="AI Color Matcher")
    parser.add_argument("--target", required=True, help="Target image path")
    parser.add_argument("--reference", required=True, help="Reference image path")
    args = parser.parse_args()

    target_path = args.target
    ref_path = args.reference

    if not os.path.exists(target_path):
        print(f"Error: Target file does not exist: {target_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(ref_path):
        print(f"Error: Reference file does not exist: {ref_path}", file=sys.stderr)
        sys.exit(1)

    print("Loading image files...")
    sys.stdout.flush()

    try:
        t_img = load_frame(target_path)
        r_img = load_frame(ref_path)
    except Exception as e:
        print(f"Error loading files: {str(e)}", file=sys.stderr)
        sys.exit(1)

    print("Analyzing color distributions...")
    sys.stdout.flush()


    t_img.thumbnail((256, 256))
    r_img.thumbnail((256, 256))


    t_arr = np.array(t_img.convert("RGB")).astype(np.float64)
    r_arr = np.array(r_img.convert("RGB")).astype(np.float64)


    y_t = 0.299 * t_arr[:,:,0] + 0.587 * t_arr[:,:,1] + 0.114 * t_arr[:,:,2]
    y_r = 0.299 * r_arr[:,:,0] + 0.587 * r_arr[:,:,1] + 0.114 * r_arr[:,:,2]

    mean_y_t = np.mean(y_t)
    mean_y_r = np.mean(y_r)

    std_y_t = np.std(y_t)
    std_y_r = np.std(y_r)



    ratio = (mean_y_r + 1.0) / (mean_y_t + 1.0)
    exposure = np.log2(ratio)
    exposure = np.clip(exposure, -3.0, 3.0)


    contrast_ratio = (std_y_r + 1.0) / (std_y_t + 1.0)
    contrast = (contrast_ratio - 1.0) * 100.0
    contrast = np.clip(contrast, -80.0, 80.0)


    applied_contrast_ratio = 1.0 + (contrast / 100.0)


    y_t_norm = (y_t - mean_y_t) * applied_contrast_ratio + mean_y_r
    y_t_norm = np.clip(y_t_norm, 0.0, 255.0)


    highs = (np.percentile(y_r, 80) - np.percentile(y_t_norm, 80)) * 1.2
    shads = (np.percentile(y_r, 20) - np.percentile(y_t_norm, 20)) * 1.2
    whites = (np.percentile(y_r, 98) - np.percentile(y_t_norm, 98)) * 1.5
    blacks = (np.percentile(y_r, 2) - np.percentile(y_t_norm, 2)) * 1.5

    highs = np.clip(highs, -80.0, 80.0)
    shads = np.clip(shads, -80.0, 80.0)
    whites = np.clip(whites, -80.0, 80.0)
    blacks = np.clip(blacks, -80.0, 80.0)


    t_hsv = np.array(t_img.convert("HSV")).astype(np.float64)
    r_hsv = np.array(r_img.convert("HSV")).astype(np.float64)

    mean_s_t = np.mean(t_hsv[:,:,1])
    mean_s_r = np.mean(r_hsv[:,:,1])

    sat_ratio = (mean_s_r + 1.0) / (mean_s_t + 1.0)
    saturation = sat_ratio * 100.0
    saturation = np.clip(saturation, 30.0, 200.0)


    r_t_mean = np.mean(t_arr[:,:,0])
    g_t_mean = np.mean(t_arr[:,:,1])
    b_t_mean = np.mean(t_arr[:,:,2])

    r_r_mean = np.mean(r_arr[:,:,0])
    g_r_mean = np.mean(r_arr[:,:,1])
    b_r_mean = np.mean(r_arr[:,:,2])


    t_rb_ratio = (r_t_mean + 1.0) / (b_t_mean + 1.0)
    r_rb_ratio = (r_r_mean + 1.0) / (b_r_mean + 1.0)
    temp_ratio = r_rb_ratio / (t_rb_ratio + 1e-5)
    temperature = np.log2(temp_ratio) * 100.0
    temperature = np.clip(temperature, -120.0, 120.0)


    t_mag_mean = (r_t_mean + b_t_mean) / 2.0
    r_mag_mean = (r_r_mean + b_r_mean) / 2.0
    t_tint_bal = (t_mag_mean + 1.0) / (g_t_mean + 1.0)
    r_tint_bal = (r_mag_mean + 1.0) / (g_r_mean + 1.0)
    tint_ratio = r_tint_bal / (t_tint_bal + 1e-5)
    tint = np.log2(tint_ratio) * 100.0
    tint = np.clip(tint, -120.0, 120.0)

    result = {
        "temperature": round(float(temperature), 2),
        "tint": round(float(tint), 2),
        "exposure": round(float(exposure), 2),
        "contrast": round(float(contrast), 2),
        "highlights": round(float(highs), 2),
        "shadows": round(float(shads), 2),
        "whites": round(float(whites), 2),
        "blacks": round(float(blacks), 2),
        "saturation": round(float(saturation), 2)
    }

    print("Success: Parameters calculated")
    print(f"RESULT_JSON:{json.dumps(result)}")
    sys.stdout.flush()
    sys.exit(0)

if __name__ == "__main__":
    main()
