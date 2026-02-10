#!/bin/bash
set -e

echo "Building instrumented C NetHack for animation tracing..."

# Create output directory
mkdir -p ../../test/animations/traces/c/

# Check if nethack-c exists
if [ ! -d "../../nethack-c" ]; then
    echo "Error: nethack-c directory not found"
    echo "Please clone NetHack C source to nethack-c/"
    exit 1
fi

cd ../../nethack-c

# Note: Actual patching would require applying the patches
# For now, just document the manual process
echo ""
echo "Manual instrumentation steps:"
echo "1. Edit src/display.c - add ANIMATION_TRACE code from display_instrumentation.patch"
echo "2. Edit win/tty/termcap.c - add ANIMATION_TRACE code from termcap_instrumentation.patch"
echo "3. Run: make clean"
echo "4. Run: make CFLAGS=\"-DANIMATION_TRACE\" install"
echo ""
echo "Then run nethack and animations will be logged to test/animations/traces/c/"
