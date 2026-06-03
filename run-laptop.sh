#!/bin/bash
# Serve the IB Prep app locally
# Open http://localhost:8765 in your browser
cd "$(dirname "$0")/www" && python3 -m http.server 8765
