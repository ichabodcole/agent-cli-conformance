#!/bin/sh
# HALF OF A PAIR. This one writes the single byte 0x80; `writes-invalid-byte-81.sh` writes 0x81.
#
# Two different one-byte streams, and before the observation carried a digest they produced
# byte-identical evidence (review R6-1). `0x80` and `0x81` are both invalid on their own — a
# UTF-8 continuation byte with no lead byte in front of it — so each decodes to one `U+FFFD`,
# which re-encodes to `EF BF BD`. The recording was therefore `stdout: "�"` with
# `stdoutBytes: 1` on BOTH, and neither field separated them:
#
#   { "sourceByte": 128, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
#   { "sourceByte": 129, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
#
# D4 compared those decoded strings while its rule, its page and its own pass detail all said
# "byte-identical", so it could certify different raw output as the same output.
#
# POSIX shell rather than a `.ts` fixture for the same reason the crash fixtures are: the fixture
# has to be able to produce the recording the assertion is about, and `printf '\200'` in `sh`
# writes exactly one byte with no encoding layer in the way. Anything writing through a JS string
# would have to construct the invalid byte as a Buffer, which is the runner's own path and would
# make the test partly a test of itself.
#
# Not a conformance fixture: no checker is meant to pass or fail against it. It exists so the
# digest has something that can falsify it — remove `stdoutDigest` and the pair becomes
# indistinguishable again, which is what the regression test asserts.
printf '\200'
