# Serverless Patterns

Comprehensive guide to serverless architectures across AWS Lambda, Azure Functions, and Google Cloud Functions. Covers patterns, best practices, and real-world implementations.

## Serverless Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│              Serverless Stack                          │
├────────────────────┬───────────────────────────────────┤
│   Event Sources    │    Compute Layer                  │
├────────────────────┼───────────────────────────────────┤
│ API Gateway        │  AWS Lambda                       │
│ S3 Events          │  Azure Functions                  │
│ DynamoDB Streams   │  Cloud Functions                  │
│ SQS/SNS            │  Cloud Run                        │
│ EventBridge        │                                   │
│ CloudWatch Events  │                                   │
├────────────────────┼───────────────────────────────────┤
│   Data Layer       │    Integration                    │
├────────────────────┼───────────────────────────────────┤
│ DynamoDB           │  Step Functions                   │
│ S3                 │  Logic Apps                       │
│ Firestore          │  Workflows                        │
│ Aurora Serverless  │  EventBridge                      │
└────────────────────┴───────────────────────────────────┘
```

## Pattern 1: API with Lambda

### AWS Lambda + API Gateway

**Serverless REST API:**
```yaml
# SAM template
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.11
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref UsersTable
        POWERTOOLS_SERVICE_NAME: users-api
        LOG_LEVEL: INFO
    Layers:
      - !Sub 'arn:aws:lambda:${AWS::Region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:51'

Resources:
  # API Gateway
  UsersApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      TracingEnabled: true
      MethodSettings:
        - ResourcePath: '/*'
          HttpMethod: '*'
          LoggingLevel: INFO
          DataTraceEnabled: true
          MetricsEnabled: true
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn
        ApiKeyRequired: false
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization,X-Amz-Date'"
        AllowOrigin: "'*'"
      AccessLogSetting:
        DestinationArn: !GetAtt ApiLogGroup.Arn
        Format: '{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","routeKey":"$context.routeKey","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength"}'

  # Lambda Functions
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/get_user/
      Handler: app.lambda_handler
      Description: Get user by ID
      Events:
        GetUser:
          Type: Api
          Properties:
            RestApiId: !Ref UsersApi
            Path: /users/{userId}
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref UsersTable
      Environment:
        Variables:
          POWERTOOLS_METRICS_NAMESPACE: UsersAPI

  CreateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/create_user/
      Handler: app.lambda_handler
      Description: Create new user
      MemorySize: 512
      Events:
        CreateUser:
          Type: Api
          Properties:
            RestApiId: !Ref UsersApi
            Path: /users
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable
      Environment:
        Variables:
          POWERTOOLS_METRICS_NAMESPACE: UsersAPI

  UpdateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/update_user/
      Handler: app.lambda_handler
      Description: Update user
      Events:
        UpdateUser:
          Type: Api
          Properties:
            RestApiId: !Ref UsersApi
            Path: /users/{userId}
            Method: PUT
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable

  DeleteUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/delete_user/
      Handler: app.lambda_handler
      Description: Delete user
      Events:
        DeleteUser:
          Type: Api
          Properties:
            RestApiId: !Ref UsersApi
            Path: /users/{userId}
            Method: DELETE
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable

  # DynamoDB Table
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: Users
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
        - AttributeName: email
          AttributeType: S
        - AttributeName: createdAt
          AttributeType: N
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: EmailIndex
          KeySchema:
            - AttributeName: email
              KeyType: HASH
          Projection:
            ProjectionType: ALL
        - IndexName: CreatedAtIndex
          KeySchema:
            - AttributeName: userId
              KeyType: HASH
            - AttributeName: createdAt
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true

  # CloudWatch Log Groups
  ApiLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/apigateway/users-api
      RetentionInDays: 30

  # Cognito User Pool
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: users-pool
      MfaConfiguration: OPTIONAL
      EnabledMfas:
        - SOFTWARE_TOKEN_MFA
      Schema:
        - Name: email
          Required: true
          Mutable: false
      AutoVerifiedAttributes:
        - email

Outputs:
  UsersApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${UsersApi}.execute-api.${AWS::Region}.amazonaws.com/prod'

  UsersTableName:
    Description: DynamoDB table name
    Value: !Ref UsersTable
```

**Lambda Function with Best Practices:**
```python
# functions/get_user/app.py
import json
import os
import boto3
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError

# Initialize Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    """
    Get user by ID from DynamoDB
    """
    try:
        # Extract user ID from path parameters
        user_id = event['pathParameters']['userId']

        logger.info(f"Retrieving user: {user_id}")

        # Get item from DynamoDB
        response = table.get_item(
            Key={'userId': user_id}
        )

        if 'Item' not in response:
            logger.warning(f"User not found: {user_id}")
            metrics.add_metric(name="UserNotFound", unit=MetricUnit.Count, value=1)

            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'User not found',
                    'userId': user_id
                })
            }

        # Success
        user = response['Item']
        logger.info(f"User retrieved successfully: {user_id}")
        metrics.add_metric(name="UserRetrieved", unit=MetricUnit.Count, value=1)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(user, default=str)
        }

    except ClientError as e:
        logger.exception(f"DynamoDB error: {e}")
        metrics.add_metric(name="DynamoDBError", unit=MetricUnit.Count, value=1)

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }

    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        metrics.add_metric(name="UnexpectedError", unit=MetricUnit.Count, value=1)

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
```

## Pattern 2: Event-Driven Architecture

### S3 Event Processing

```yaml
# SAM template for S3 event processing
Resources:
  ImageProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/image_processor/
      Handler: app.lambda_handler
      Runtime: python3.11
      MemorySize: 1024
      Timeout: 300
      Environment:
        Variables:
          DEST_BUCKET: !Ref ProcessedBucket
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref UploadBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: uploads/
                  - Name: suffix
                    Value: .jpg
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref UploadBucket
        - S3CrudPolicy:
            BucketName: !Ref ProcessedBucket

  UploadBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::StackName}-uploads'
      NotificationConfiguration:
        LambdaConfigurations:
          - Event: s3:ObjectCreated:*
            Function: !GetAtt ImageProcessorFunction.Arn
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: uploads/

  ProcessedBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::StackName}-processed'
```

**Image Processing Lambda:**
```python
# functions/image_processor/app.py
import os
import boto3
from PIL import Image
from io import BytesIO
from aws_lambda_powertools import Logger

logger = Logger()
s3 = boto3.client('s3')

@logger.inject_lambda_context
def lambda_handler(event, context):
    """Process uploaded images"""

    dest_bucket = os.environ['DEST_BUCKET']

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        logger.info(f"Processing {bucket}/{key}")

        try:
            # Download image
            response = s3.get_object(Bucket=bucket, Key=key)
            image_data = response['Body'].read()

            # Process image
            img = Image.open(BytesIO(image_data))

            # Create thumbnail
            img.thumbnail((200, 200))

            # Save to buffer
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            buffer.seek(0)

            # Upload to destination
            thumb_key = f"thumbnails/{key.split('/')[-1]}"
            s3.put_object(
                Bucket=dest_bucket,
                Key=thumb_key,
                Body=buffer,
                ContentType='image/jpeg'
            )

            logger.info(f"Thumbnail created: {thumb_key}")

        except Exception as e:
            logger.exception(f"Error processing {key}: {e}")
            raise
```

## Pattern 3: Async Processing with SQS

```yaml
Resources:
  # SQS Queue
  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: data-processing-queue
      VisibilityTimeout: 300
      MessageRetentionPeriod: 1209600
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: data-processing-dlq
      MessageRetentionPeriod: 1209600

  # Lambda processor
  ProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/processor/
      Handler: app.lambda_handler
      Runtime: python3.11
      MemorySize: 512
      Timeout: 300
      ReservedConcurrentExecutions: 10
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessingQueue.Arn
            BatchSize: 10
            MaximumBatchingWindowInSeconds: 5
      Policies:
        - SQSPollerPolicy:
            QueueName: !GetAtt ProcessingQueue.QueueName
        - DynamoDBCrudPolicy:
            TableName: !Ref ResultsTable

  # API to submit jobs
  SubmitJobFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/submit_job/
      Handler: app.lambda_handler
      Runtime: python3.11
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /jobs
            Method: POST
      Environment:
        Variables:
          QUEUE_URL: !Ref ProcessingQueue
      Policies:
        - SQSSendMessagePolicy:
            QueueName: !GetAtt ProcessingQueue.QueueName
```

## Pattern 4: Step Functions Orchestration

```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "${ValidateOrderFunction}",
      "Next": "CheckInventory",
      "Catch": [{
        "ErrorEquals": ["ValidationError"],
        "Next": "OrderFailed"
      }]
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "${CheckInventoryFunction}",
      "Next": "InventoryAvailable?",
      "Retry": [{
        "ErrorEquals": ["ServiceException"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2
      }]
    },
    "InventoryAvailable?": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.inventory.available",
        "BooleanEquals": true,
        "Next": "ProcessPayment"
      }],
      "Default": "OutOfStock"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "${ProcessPaymentFunction}",
      "Next": "CreateShipment",
      "Catch": [{
        "ErrorEquals": ["PaymentFailed"],
        "Next": "PaymentFailed"
      }]
    },
    "CreateShipment": {
      "Type": "Task",
      "Resource": "${CreateShipmentFunction}",
      "Next": "SendConfirmation"
    },
    "SendConfirmation": {
      "Type": "Task",
      "Resource": "${SendConfirmationFunction}",
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "OutOfStock": {
      "Type": "Task",
      "Resource": "${NotifyOutOfStockFunction}",
      "Next": "OrderFailed"
    },
    "PaymentFailed": {
      "Type": "Task",
      "Resource": "${NotifyPaymentFailedFunction}",
      "Next": "OrderFailed"
    },
    "OrderFailed": {
      "Type": "Fail",
      "Error": "OrderProcessingFailed"
    }
  }
}
```

## Pattern 5: Scheduled Tasks

```yaml
Resources:
  CleanupFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/cleanup/
      Handler: app.lambda_handler
      Runtime: python3.11
      Events:
        DailyCleanup:
          Type: Schedule
          Properties:
            Schedule: 'cron(0 2 * * ? *)'  # 2 AM UTC daily
            Description: Daily cleanup task
            Enabled: true
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref TempBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref SessionsTable

  WeeklyReportFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/weekly_report/
      Handler: app.lambda_handler
      Runtime: python3.11
      Events:
        WeeklyReport:
          Type: Schedule
          Properties:
            Schedule: 'cron(0 9 ? * MON *)'  # 9 AM UTC every Monday
      Environment:
        Variables:
          REPORT_BUCKET: !Ref ReportsBucket
```

## Azure Functions

**HTTP Trigger:**
```python
# function_app.py
import azure.functions as func
import logging
import json

app = func.FunctionApp()

@app.function_name(name="HttpTrigger")
@app.route(route="users/{userId}", methods=["GET"])
def get_user(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    user_id = req.route_params.get('userId')

    if not user_id:
        return func.HttpResponse(
            json.dumps({"error": "userId is required"}),
            status_code=400,
            mimetype="application/json"
        )

    # Get user from database
    # ...

    return func.HttpResponse(
        json.dumps({"userId": user_id, "name": "John Doe"}),
        status_code=200,
        mimetype="application/json"
    )

@app.function_name(name="BlobTrigger")
@app.blob_trigger(arg_name="myblob",
                  path="uploads/{name}",
                  connection="AzureWebJobsStorage")
def process_blob(myblob: func.InputStream):
    logging.info(f"Processing blob: {myblob.name}")
    # Process blob
```

## Google Cloud Functions

**HTTP Function:**
```python
# main.py
import functions_framework
from google.cloud import firestore
import json

db = firestore.Client()

@functions_framework.http
def get_user(request):
    """HTTP Cloud Function"""

    # Set CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}

    # Get user ID from path
    user_id = request.args.get('userId')

    if not user_id:
        return (json.dumps({'error': 'userId is required'}), 400, headers)

    # Get user from Firestore
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()

    if not doc.exists:
        return (json.dumps({'error': 'User not found'}), 404, headers)

    return (json.dumps(doc.to_dict()), 200, headers)

@functions_framework.cloud_event
def process_storage(cloud_event):
    """Cloud Storage trigger"""

    data = cloud_event.data

    bucket = data["bucket"]
    name = data["name"]

    print(f"Processing file: gs://{bucket}/{name}")
    # Process file
```

## Cold Start Optimization

**Provisioned Concurrency (AWS):**
```yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      # ... function configuration
      AutoPublishAlias: live
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 5

  # Scheduled scaling
  ProvisionedConcurrencySchedule:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      ServiceNamespace: lambda
      ResourceId: !Sub 'function:${ApiFunction}:live'
      ScalableDimension: lambda:function:ProvisionedConcurrentExecutions
      MinCapacity: 1
      MaxCapacity: 10
```

**Keep-Warm Strategy:**
```python
# Scheduled ping to keep functions warm
@app.function_name(name="KeepWarm")
@app.schedule(schedule="0 */5 * * * *",
              arg_name="timer")
def keep_warm(timer: func.TimerRequest):
    # Invoke critical functions to keep them warm
    pass
```

## Best Practices

1. **Function Design:**
   - Single responsibility
   - Stateless functions
   - Idempotent operations
   - Efficient memory usage
   - Fast initialization

2. **Error Handling:**
   - Comprehensive logging
   - Dead letter queues
   - Retry policies
   - Circuit breakers
   - Error metrics

3. **Performance:**
   - Right-size memory
   - Minimize cold starts
   - Reuse connections
   - Async where possible
   - Batch processing

4. **Security:**
   - Least privilege IAM
   - Environment variables for secrets
   - VPC for private resources
   - Enable tracing
   - Encrypt sensitive data

5. **Cost Optimization:**
   - Right-size memory and timeout
   - Use provisioned concurrency wisely
   - Implement caching
   - Batch operations
   - Monitor and optimize

## Anti-Patterns

- Long-running functions (use containers instead)
- Storing state in function memory
- No error handling or retries
- Synchronous chaining of functions
- Ignoring cold start impact
- No monitoring or logging
- Overuse of provisioned concurrency
- Not using layers for dependencies
