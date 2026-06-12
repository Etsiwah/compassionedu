"""
Image Cropping Script - Removes black borders from images
Processes: ghana.jpg, ghana.png, history1.png, motto.png
"""

from PIL import Image
import os

def remove_black_border(image_path, output_path=None, threshold=30):
    """
    Remove black borders from an image by cropping to non-black content.
    
    Args:
        image_path: Path to input image
        output_path: Path to save cropped image (if None, overwrites original)
        threshold: Pixel brightness threshold (0-255, default 30 for near-black)
    """
    try:
        # Open image
        img = Image.open(image_path)
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Get image data
        pixels = img.load()
        width, height = img.size
        
        # Find boundaries of non-black content
        left = width
        right = 0
        top = height
        bottom = 0
        
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                # Check if pixel is not black (all RGB values > threshold)
                if r > threshold or g > threshold or b > threshold:
                    left = min(left, x)
                    right = max(right, x)
                    top = min(top, y)
                    bottom = max(bottom, y)
        
        # Add small margin (5 pixels) to avoid cutting content
        margin = 5
        left = max(0, left - margin)
        right = min(width - 1, right + margin)
        top = max(0, top - margin)
        bottom = min(height - 1, bottom + margin)
        
        # Check if we found any non-black content
        if left < right and top < bottom:
            # Crop the image
            cropped = img.crop((left, top, right + 1, bottom + 1))
            
            # Save the cropped image
            if output_path is None:
                output_path = image_path
            
            cropped.save(output_path, quality=95)
            
            print(f"✓ Processed: {os.path.basename(image_path)}")
            print(f"  Original size: {width}x{height}")
            print(f"  Cropped size: {right - left + 1}x{bottom - top + 1}")
            print(f"  Saved to: {output_path}\n")
            
            return True
        else:
            print(f"✗ No non-black content found in {os.path.basename(image_path)}\n")
            return False
            
    except Exception as e:
        print(f"✗ Error processing {os.path.basename(image_path)}: {str(e)}\n")
        return False

def main():
    # Define images to process
    base_path = "frontend/public/images"
    images = [
        "ghana.jpg",
        "ghana.png",
        "history1.png",
        "motto.png"
    ]
    
    print("=" * 60)
    print("Image Border Removal Tool")
    print("=" * 60)
    print()
    
    # Check if PIL is installed
    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow library not found!")
        print("Please install it using: pip install Pillow")
        return
    
    # Process each image
    success_count = 0
    for image_name in images:
        image_path = os.path.join(base_path, image_name)
        
        if os.path.exists(image_path):
            if remove_black_border(image_path):
                success_count += 1
        else:
            print(f"✗ File not found: {image_path}\n")
    
    print("=" * 60)
    print(f"Processing complete: {success_count}/{len(images)} images successfully cropped")
    print("=" * 60)

if __name__ == "__main__":
    main()
