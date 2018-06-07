#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f add-test
mkdir add-test
cd add-test
echo ""
echo "Cloning collection..."
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 .

# Remove some files from inventory 
echo ""
echo "Pruning extras..."

node ../../src/prune.js -p ./EXTRAS .

# Add missing files to inventory 
echo ""
echo "Doing prune..."

node ../../src/add.js -v -r .

cd ..