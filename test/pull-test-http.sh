#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f pull-test
mkdir pull-test
cd pull-test
echo ""
echo "Cloning collection..."
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 .

# Remove some files from inventory and then pull
echo ""
echo "Change a few things..."

cp .mimic/checksum.mimic .mimic/checksum.tmp
grep -v EXTRAS .mimic/checksum.tmp > .mimic/checksum.mimic
rm -f .mimic/checksum.tmp
# A few bous entries
echo "0,1361831672000,0000000000000000000000000000000000000000,./BOGUS" >> .mimic/checksum.mimic
echo "6083,1363031161000,b00ccbade013a08b5b5bbe5c6440e4753b7fbc88,./BOGUS/VOLDESC.CAT" >> .mimic/checksum.mimic
echo "6586,1363031608000,a1e3724f2467821ddd0520b7c9dfb88f78c2f40e,./BOGUS/CHECKSUMS.TXT" >> .mimic/checksum.mimic
echo "5372,1328577692000,12d4cee083d11530d61b467183ebd7cd0a1131a5,./BOGUS/ERRATA.TXT" >> .mimic/checksum.mimic

# Should indicate files needed to copy and deleted
echo ""
echo "Doing pull..."

node ../../src/pull.js -v .
cd ..