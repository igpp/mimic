#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f prune-test
mkdir prune-test
cd prune-test
echo ""
echo "Cloning collection..."
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 .

# Remove some files from inventory 
echo ""
echo "Doing prune..."

node ../../src/prune.js -v -p ./EXTRAS .
cd ..