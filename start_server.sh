#!/bin/bash

fail() {
    echo $0
    echo -e '\n'

    read -n1 -r -p "Press any key to continue..." key
    echo -e '\n'
    exit 1
}

cd server
npm start || fail "Unable to start server!"
