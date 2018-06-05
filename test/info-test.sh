#!/bin/bash
# Test creating a Mimic clone using HTTP
# Should indicate files needed to copy and deleted
cd pull-test
echo ""
node ../../src/info.js -v .
cd ..