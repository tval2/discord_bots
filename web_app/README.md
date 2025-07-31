# 🎴 Godpack Card Identifier Web App

A beautiful web interface for identifying cards in godpack images. Select which pack types you care about and test card identification with a modern, responsive UI.

## ✨ Features

- **Checkbox Selection**: Choose which pack types you want to test
- **Multiple Input Methods**: Load images from URL or upload files
- **Auto-Identification**: Automatically identify cards when images are loaded
- **Smart Pack Detection**: Tries multiple pack types until one works
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Settings Persistence**: Your selections are saved in the browser
- **Real-time Results**: See identified cards with confidence scores

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install web app dependencies
cd web_app
npm install

# Install Python dependencies (from parent directory)
cd ..
pip3 install -r requirements.txt
```

### 2. Start the Server

```bash
cd web_app
npm start
```

### 3. Open in Browser

Navigate to: http://localhost:3000

## 🎯 How to Use

### 1. Select Pack Types
- Check the boxes for pack types you want to test
- Use "Select All" or "Select None" for quick selection
- Your selections are automatically saved

### 2. Load an Image
- **From URL**: Paste a Discord CDN URL and click "Load Image"
- **From File**: Upload an image file from your computer
- The image will be previewed automatically

### 3. Identify Cards
- Click "Identify Cards" or enable "Auto-identify"
- The app will try each selected pack type until one works
- Results show the identified cards with their positions

### 4. View Results
- ✅ **Success**: Shows pack type and list of identified cards
- ❌ **Error**: Shows error message with troubleshooting tips

## 🔧 Configuration

### Server URL
- Default: `http://localhost:3000`
- Change if running on a different port or host

### Auto-Identification
- Enable to automatically identify cards when images are loaded
- Disable to manually trigger identification

## 📁 File Structure

```
web_app/
├── index.html          # Main HTML page
├── styles.css          # Modern CSS styling
├── app.js              # Frontend JavaScript
├── server.js           # Express server
├── package.json        # Node.js dependencies
├── README.md           # This file
└── temp/               # Temporary image storage (auto-created)
```

## 🧪 Testing

### Test with Your Image
1. Copy the Discord CDN URL: `https://cdn.discordapp.com/attachments/1372478920204746802/1399233375935533146/godpack.png?ex=68884121&is=6886efa1&hm=152cd5fac724717e5f24f6243f5c274ac0cf045f1321e72790e5c2e155b6544f&`
2. Paste it into the "Image URL" field
3. Select "Genetic Apex" (or the appropriate pack type)
4. Click "Load Image" and watch the magic happen!

### Health Check
Visit http://localhost:3000/health to verify the server is running.

## 🛠️ Development

### Development Mode
```bash
npm run dev
```
Uses nodemon for automatic server restart on file changes.

### API Endpoints

- `POST /identify` - Identify cards in an image
  - Body: `{ "imageUrl": "...", "packName": "..." }`
  - Returns: `{ "success": true, "set_code": "A1", "cards": [...] }`

- `GET /health` - Server health check
  - Returns: `{ "status": "ok", "timestamp": "..." }`

## 🎨 Customization

### Styling
Edit `styles.css` to customize the appearance:
- Colors and gradients
- Layout and spacing
- Animations and transitions
- Responsive breakpoints

### Pack Types
Add new pack types in `index.html` and `app.js`:
1. Add checkbox in the pack grid
2. Add display name mapping
3. Update the set name mapping in the Python script

## 🐛 Troubleshooting

### Common Issues

**"Failed to load image"**
- Check the image URL is accessible
- Ensure CORS is enabled for external URLs
- Try uploading the file instead

**"Could not identify cards"**
- Verify the pack type is correct
- Check that the image contains a valid godpack
- Ensure the Python script and card images are available

**"Python script failed"**
- Verify Python 3 is installed and accessible as `python3`
- Check that all Python dependencies are installed
- Ensure the card image directories exist

### Debug Mode
Open browser developer tools (F12) to see detailed error messages and API responses.

## 📱 Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (responsive design)

## 🔒 Security Notes

- Images are temporarily stored locally and automatically cleaned up
- No data is sent to external servers (except for image downloads)
- All processing happens locally on your machine

---

**Happy card identifying! 🎴✨** 