
## lambda function creation command
```
aws lambda create-function --function-name createTaskFunction --runtime nodejs18.x --role lambdaRole --handler index.handler --zip-file fileb://createTaskLambda.zip --region ap-south-1 --environment "Variables={COGNITO_USER_POOL_ID='',COGNITO_REGION=ap-south-1,TABLE_NAME=dynamodbtable}"
```

## lambda function url congif
```
aws lambda create-function-url-config --function-name createTaskFunction --auth-type NONE --cors file://api-cors.json --region ap-south-1
```

## to add necessary permission
```
aws lambda add-permission --function-name updateTaskFunction --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --statement-id FunctionURLAllowPublicAccess-Update --region ap-south-1
```

## to update lambda function
```
aws lambda update-function-code --function-name createTaskFunction --zip-file fileb://createTaskLambda.zip --region ap-south-1
```
