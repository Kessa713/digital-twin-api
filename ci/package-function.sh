#!/bin/bash

cd "${0%/*}"
cd ..

serverless package
