#!/bin/bash
# Build script for lord-brayne-animation
# This script builds the React app and copies the output to lord-brayne-animation/

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRET_DIR="$SCRIPT_DIR/lord-brayne-secret"
ANIMATION_DIR="$SCRIPT_DIR/lord-brayne-animation"

echo "Building lord-brayne-animation..."
echo ""

# Check if lord-brayne-secret directory exists
if [ ! -d "$SECRET_DIR" ]; then
    echo "Error: lord-brayne-secret directory not found!"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$SECRET_DIR/package.json" ]; then
    echo "Error: package.json not found in lord-brayne-secret!"
    exit 1
fi

# Navigate to secret directory
cd "$SECRET_DIR"

echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Building the app..."
npm run build

echo ""
echo "Step 3: Copying build files to lord-brayne-animation/..."

# Create animation directory if it doesn't exist
mkdir -p "$ANIMATION_DIR"

# Copy all files from dist to animation directory
cp -r dist/* "$ANIMATION_DIR/"

echo ""
echo "✅ Build complete! Files copied to lord-brayne-animation/"
echo ""
echo "Files:"
ls -lh "$ANIMATION_DIR"/* 2>/dev/null || true
if [ -d "$ANIMATION_DIR/assets" ]; then
    echo ""
    echo "Assets:"
    ls -lh "$ANIMATION_DIR/assets"/* 2>/dev/null || true
fi
