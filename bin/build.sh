#!/bin/bash

# build script.
# right now just does the cachebusting.


echo "Updating CACHEBUST hash in .env"
sed -i.bak "s/^CACHEBUST=.*$/CACHEBUST=$(git rev-parse --short HEAD)/" .env
echo "Done."
