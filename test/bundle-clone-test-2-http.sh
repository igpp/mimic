#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f bundle-test-2
mkdir bundle-test-2
cd bundle-test-2
echo "Clone bundle..."
node ../../src/bundle -v -p clone -i https://pds-ppi.igpp.ucla.edu/superseded/Ulysses Ulysses

#echo "Do a pull..."
#node ../../src/bundle.js -v -p pull .

cd ..