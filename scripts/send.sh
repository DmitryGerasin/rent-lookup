#!/bin/bash

# Send files to the target server
for file in "$@"; do
   scp "$file" "$RealEstate_SCP/$file"
done