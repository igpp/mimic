#!/bin/bash
# Test creating a Mimic clone using SCP
# This test only works internally at UCLA
rm -r -f clone-test
mkdir clone-test
cd clone-test
node ../../src/clone.js -v -i scp://128.97.68.64/pds/archive1/DATA/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 -u tking .
cd ..