import os
import sys
import glob

try:
    from PIL import Image, ImageOps
except ImportError:
    import subprocess
    print("Pillow not found. Attempting to install Pillow...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "--user"])
        from PIL import Image, ImageOps
        print("Pillow successfully installed!")
    except Exception as e:
        print(f"Error: Failed to auto-install Pillow: {e}")
        sys.exit(1)

def enhance_image(img_path):
    try:
        if not os.path.exists(img_path):
            return False
        img = Image.open(img_path)
        if img.mode == 'RGBA':
            alpha = img.getchannel('A')
            rgb_img = img.convert('RGB')
            enhanced_rgb = ImageOps.autocontrast(rgb_img, cutoff=0)
            enhanced_img = enhanced_rgb.convert('RGBA')
            enhanced_img.putalpha(alpha)
            enhanced_img.save(img_path)
        else:
            enhanced_img = ImageOps.autocontrast(img, cutoff=0)
            enhanced_img.save(img_path)
        print(f"Enhanced: {img_path}")
        return True
    except Exception as e:
        print(f"Warning: Failed to enhance {img_path}: {e}")
        return False

def process_frame(f):
    try:
        im = Image.open(f).convert("RGBA")


        alpha = im.getchannel('A')
        alpha_data = list(alpha.getdata())
        has_trans = any(a < 128 for a in alpha_data)


        rgb_im = im.convert('RGB')
        rgb_p = rgb_im.quantize(colors=255)
        pixels = list(rgb_p.getdata())


        new_pixels = []
        for i, a in enumerate(alpha_data):
            if a < 128:
                new_pixels.append(0)
            else:
                new_pixels.append(pixels[i] + 1)


        palette = rgb_p.getpalette()
        new_palette = [0, 0, 0] + palette[:765]


        im_p = Image.new("P", im.size)
        im_p.putdata(new_pixels)
        im_p.putpalette(new_palette)

        return im_p, has_trans

    except Exception as e:
        print(f"Warning: Failed to process frame {f}: {e}")
        return None, False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 create_gif.py <comp_folder_path>")
        sys.exit(1)

    comp_folder = sys.argv[1]
    if not os.path.exists(comp_folder):
        print(f"Error: Folder {comp_folder} does not exist.")
        sys.exit(1)


    static_thumb = os.path.join(comp_folder, "comp.png")
    enhance_image(static_thumb)


    preview_folder = os.path.join(comp_folder, "preview")
    if not os.path.exists(preview_folder):
        print("No preview folder found, skipping GIF generation.")
        sys.exit(0)

    png_files = sorted(glob.glob(os.path.join(preview_folder, "frame_*.png")))
    if not png_files:
        print("No frame PNGs found, skipping GIF generation.")
        sys.exit(0)


    frames = []
    any_trans = False
    for f in png_files:
        enhance_image(f)
        im_p, has_trans = process_frame(f)
        if im_p:
            frames.append(im_p)
            if has_trans:
                any_trans = True

    if not frames:
        print("Error: No valid frames processed for GIF.")
        sys.exit(1)

    output_gif_path = os.path.join(comp_folder, "preview.gif")
    try:
        first_frame = frames[0]
        append_frames = frames[1:]



        save_args = {
            'save_all': True,
            'append_images': append_frames,
            'duration': 66,
            'disposal': 2,
            'loop': 1
        }
        if any_trans:
            save_args['transparency'] = 0

        first_frame.save(output_gif_path, **save_args)
        print(f"Success: GIF created at {output_gif_path}")
    except Exception as e:
        print(f"Error: Failed to save GIF: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
