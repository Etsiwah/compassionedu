# Image Border Removal Instructions

You need to remove black borders from these images:
- `frontend/public/images/ghana.jpg`
- `frontend/public/images/ghana.png`
- `frontend/public/images/history1.png`
- `frontend/public/images/motto.png`

---

## Method 1: Using Online Tool (Easiest - Recommended)

### Option A: Photopea (Free Online Photoshop)

1. Go to **https://www.photopea.com/**
2. Click **File → Open** and select one of the images
3. Select the **Crop Tool** (C key or from toolbar)
4. Drag the crop handles to exclude the black borders
5. Press **Enter** to apply the crop
6. Click **File → Export as → PNG** (or JPG for .jpg files)
7. Save with the same filename
8. Repeat for all 4 images

### Option B: Remove.bg + Crop

1. Go to **https://www.remove.bg/**
2. Upload the image
3. Download the result (background removed)
4. If needed, crop any remaining borders

---

## Method 2: Using Windows Paint (Built-in)

For each image:

1. **Open the image:**
   - Right-click the image file → **Open with → Paint**

2. **Crop the black border:**
   - Click the **Select** tool (or press Ctrl+Shift+X)
   - Draw a rectangle around the content, EXCLUDING the black border
   - Click **Crop** in the ribbon (or press Ctrl+Shift+X)

3. **Save the file:**
   - Press **Ctrl+S** to save
   - OR click **File → Save**
   - Keep the same filename

4. **Repeat** for all 4 images

---

## Method 3: Using Paint 3D (Windows 10/11)

For each image:

1. **Open the image:**
   - Right-click → **Open with → Paint 3D**

2. **Crop:**
   - Click **Crop** icon in the toolbar
   - Adjust the crop handles to exclude black borders
   - Click **Done**

3. **Save:**
   - Click **Menu** (top-left) → **Save**

4. **Repeat** for all 4 images

---

## Method 4: Using Python Script (If You Install Python)

If you want to automate this:

### Step 1: Install Python
- Download from **https://www.python.org/downloads/**
- Or from Microsoft Store: Search "Python" in Windows search

### Step 2: Install Pillow
Open Command Prompt and run:
```cmd
pip install Pillow
```

### Step 3: Run the script
```cmd
cd c:\Users\kwesi\Desktop\compassionedu-main
python crop_images.py
```

The script will automatically crop all 4 images and save them.

---

## Image File Locations

Navigate to this folder:
```
c:\Users\kwesi\Desktop\compassionedu-main\frontend\public\images
```

Files to edit:
- ghana.jpg
- ghana.png
- history1.png
- motto.png

---

## After Editing

Once you've cropped the images:

1. **Refresh your browser** (Ctrl + Shift + R) to see the changes
2. **Commit to Git:**
   ```cmd
   cd c:\Users\kwesi\Desktop\compassionedu-main
   git add frontend/public/images/
   git commit -m "Remove black borders from ghana, history1, and motto images"
   git push origin master
   ```

---

## Quick Summary

**Fastest method:** Use Photopea (https://www.photopea.com/) - it's free and works in your browser like Photoshop.

**Simplest method:** Use Windows Paint - it's already installed on your computer.

Choose whichever method you're most comfortable with! 🎨
