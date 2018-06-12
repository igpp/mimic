#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f bundle-test
mkdir bundle-test
cd bundle-test
echo "Initialize bundle..."
node ../../src/init.js -v .
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 VG2-U-PWS-4-SUMM-SA-48SEC-V1.0
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-MAG-4-SUMM-HGCOORDS-48SEC-V1.0 VG2-U-MAG-4-SUMM-HGCOORDS-48SEC-V1.0
node ../../src/bundle.js -v -a VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 .
node ../../src/bundle.js -v -a VG2-U-MAG-4-SUMM-HGCOORDS-48SEC-V1.0 .
node ../../src/bundle.js -v -l .

echo "Do a pull..."
node ../../src/bundle.js -v -p pull .

echo "Do a refresh..."
node ../../src/bundle.js -v -p refresh .

echo "Do a add..."
node ../../src/bundle.js -v -p add .

echo "Remove collection..."
node ../../src/bundle.js -v -r VG2-U-MAG-4-SUMM-HGCOORDS-48SEC-V1.0 .
node ../../src/bundle.js -v -l .
cd ..