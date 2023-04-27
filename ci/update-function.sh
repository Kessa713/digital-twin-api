#!/bin/bash

cd "${0%/*}"
cd ..

serverless package

while read -r line
do
  FN_NAME=$(echo "$line" | cut -d ";" -f 1)

  FUNCTION_ARN=$(aws lambda update-function-code \
  --function-name $FN_NAME \
  --zip-file fileb://.serverless/$FN_NAME.zip \
  --profile personal \
  --query FunctionArn \
  --region ap-southeast-1)

  echo Updated Function $FUNCTION_ARN

done < "ci/definitions.txt"
