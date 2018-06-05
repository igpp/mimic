#!/bin/bash
# Test creating a Mimic clone using HTTP
# Should indicate files needed to copy and deleted
cd pull-test
echo ""
echo "Doing pull..."

node ../../src/pull.js -v .
cd ..