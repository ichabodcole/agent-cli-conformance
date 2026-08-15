#!/bin/sh
# The other half of the pair. See `writes-invalid-byte-80.sh` for what the two exist to falsify.
#
# One byte, one different byte. Everything a pre-digest `Observation` recorded about this run was
# equal to what it recorded about its sibling — same decoded string, same byte count, same
# re-encoding — and the streams were never the same.
printf '\201'
