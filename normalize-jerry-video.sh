#!/bin/bash
# Script to normalize Jerry videos to match the standard framing
# Usage: ./normalize-jerry-video.sh input.mp4 output.mp4
#
# This script scales up smaller Jerry videos to match the reference size
# Reference: jerry-sideeye.mp4 has Jerry at crop=544:704:108:344

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 input.mp4 output.mp4"
    echo "Example: $0 new-jerry/jerry-angry-chat.mp4 jerry-angry-chat.mp4"
    exit 1
fi

INPUT="$1"
OUTPUT="$2"

# Target dimensions: 720x1280 (9:16 portrait)
TARGET_WIDTH=720
TARGET_HEIGHT=1280

# Reference Jerry content height (from jerry-sideeye.mp4)
REFERENCE_HEIGHT=704

echo "Processing: $INPUT -> $OUTPUT"
echo "Step 1: Analyzing video dimensions..."

# Get current video dimensions
VIDEO_HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$INPUT")

if [ -z "$VIDEO_HEIGHT" ]; then
    echo "Error: Could not detect video height"
    exit 1
fi

# The new videos are already 720x1280 but Jerry is smaller within the frame
# We need to scale up the entire frame content to make Jerry match the reference size
# Reference Jerry occupies ~704px of a 1280px frame (55% of height)
# New Jerry occupies ~528px of a 1280px frame (41% of height)
# Scale factor: 704/528 = 1.333...

# For simplicity, we'll use a fixed scale factor since input is always 720x1280
SCALE_FACTOR=1.3333

echo "Input dimensions: 720x${VIDEO_HEIGHT}"
echo "Scale factor: ${SCALE_FACTOR}x (to match reference Jerry size)"
echo "Step 2: Scaling content and cropping to ${TARGET_WIDTH}x${TARGET_HEIGHT}..."

# Process: scale entire frame up -> crop to target size (centered)
# This preserves all of Jerry's features while making him the right size
SCALED_WIDTH=$(echo "720 * ${SCALE_FACTOR}" | bc | cut -d'.' -f1)
SCALED_HEIGHT=$(echo "${VIDEO_HEIGHT} * ${SCALE_FACTOR}" | bc | cut -d'.' -f1)

echo "Scaled dimensions: ${SCALED_WIDTH}x${SCALED_HEIGHT}"

ffmpeg -y -i "$INPUT" -vf "scale=${SCALED_WIDTH}:${SCALED_HEIGHT},crop=${TARGET_WIDTH}:${TARGET_HEIGHT}:(iw-${TARGET_WIDTH})/2:(ih-${TARGET_HEIGHT})/2" -c:v libx264 -preset slow -crf 18 -c:a copy "$OUTPUT"

if [ $? -eq 0 ]; then
    echo "Success! Output saved to: $OUTPUT"

    # Show file sizes
    INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
    OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
    echo "Input size: $INPUT_SIZE"
    echo "Output size: $OUTPUT_SIZE"
else
    echo "Error: ffmpeg processing failed"
    exit 1
fi
