#!/bin/bash

cd "${0%/*}"
cd ..

while read -r line
do
  FN_NAME=$(echo "$line" | cut -d ";" -f 1)
  FN_HNAME=$(echo "$line" | cut -d ";" -f 2)
  FN_DES=$(echo "$line" | cut -d ";" -f 3)

  FUNCTION_ARN=$(aws lambda get-function \
  --function-name $FN_NAME \
  --query Configuration.FunctionArn \
  --profile personal \
  --region ap-southeast-1 \
  | tr -d '"')

  echo $FUNCTION_ARN

  if [[ $FUNCTION_ARN == arn* ]]
  then
    echo Function already exists, skipping creation...
  else
    ROLE_ARN=$(aws iam get-role \
    --role-name lambda-$FN_NAME-role \
    --query Role.Arn \
    --profile personal \
    | tr -d '"')

    echo $ROLE_ARN

    if [[ $ROLE_ARN == arn* ]]
    then
      echo Role already exists, skipping creation...
    else
      ROLE_ARN=$(aws iam create-role \
      --role-name lambda-$FN_NAME-role \
      --assume-role-policy-document "{\"Version\": \"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}" \
      --query Role.Arn \
      --profile personal \
      | tr -d '"')

      echo Created Role $ROLE_ARN
      echo Waiting for Role to become assumable
      sleep 20
    fi

    aws iam put-role-policy \
    --role-name lambda-$FN_NAME-role \
    --policy-name LoggingPolicy \
    --policy-document "{\"Version\": \"2012-10-17\",\"Statement\": [{\"Effect\": \"Allow\",\"Action\": [\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\": \"*\"}]}" \
    --profile personal

    FUNCTION_ARN=$(aws lambda create-function \
    --function-name $FN_NAME \
    --description "$FN_DES" \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler src/handler.$FN_HNAME \
    --zip-file fileb://.serverless/$FN_NAME.zip \
    --timeout 3 \
    --memory-size 1024 \
    --profile personal \
    --query FunctionArn \
    --region ap-southeast-1)

    echo Created Function $FUNCTION_ARN
fi

done < "ci/definitions.txt"
