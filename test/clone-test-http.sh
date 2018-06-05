#!/bin/bash
# Test creating a Mimic clone using HTTP
rm -r -f clone-test
mkdir clone-test
cd clone-test
node ../../src/clone.js -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 -u anyone .
cd ..