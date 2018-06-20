#!/bin/bash
# Test creating a Mimic clone using HTTP
# Run after clone test
cd bundle-test

echo "Do a pull..."
node ../../src/bundle.js -v -q -p refresh .

cd ..