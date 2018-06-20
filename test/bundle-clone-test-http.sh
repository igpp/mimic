#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f bundle-test
mkdir bundle-test
cd bundle-test
echo "Clone bundle..."
node ../../src/bundle -v -p clone -i https://pds-ppi.igpp.ucla.edu/superseded/Voyager .

#echo "Do a pull..."
#node ../../src/bundle.js -v -p pull .

cd ..