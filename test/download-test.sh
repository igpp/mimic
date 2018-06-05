#!/bin/bash
# Test downloading a package using Mimic technology
rm -r -f download-test
node ../src/download.js -v -p download.mimic download-test