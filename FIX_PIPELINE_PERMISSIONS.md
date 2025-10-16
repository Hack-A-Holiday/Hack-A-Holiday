# Fix CodePipeline Permissions for Elastic Beanstalk

## The Issue
The CodePipeline service role needs additional permissions to deploy to Elastic Beanstalk.

## Solution: Add IAM Policy to CodePipeline Role

### Option 1: Using AWS Console (Easiest)

1. Go to IAM Console: https://console.aws.amazon.com/iam/

2. Click **Roles** in the left sidebar

3. Search for: `AWSCodePipelineServiceRole-us-east-1-hack-a-holiday-backend-pip`

4. Click on the role

5. Click **Add permissions** → **Attach policies**

6. Search for and attach: `AWSElasticBeanstalkFullAccess`

7. Click **Attach policy**

8. Go back to your pipeline and click **Release change** to retry

---

### Option 2: Using AWS CLI (Quick)

Run this command in PowerShell:

```powershell
aws iam attach-role-policy `
  --role-name AWSCodePipelineServiceRole-us-east-1-hack-a-holiday-backend-pip `
  --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkFullAccess
```

Then go back to CodePipeline and click **Release change**

---

### Option 3: Create Custom Policy (Most Secure)

If you want minimal permissions instead of full access:

```powershell
# Create a policy file
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticbeanstalk:CreateApplicationVersion",
        "elasticbeanstalk:UpdateEnvironment",
        "elasticbeanstalk:DescribeEnvironments",
        "elasticbeanstalk:DescribeApplicationVersions",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "*"
    }
  ]
}
"@ | Out-File -FilePath eb-policy.json -Encoding utf8

# Create the policy
aws iam create-policy `
  --policy-name CodePipelineElasticBeanstalkPolicy `
  --policy-document file://eb-policy.json

# Attach to role
aws iam attach-role-policy `
  --role-name AWSCodePipelineServiceRole-us-east-1-hack-a-holiday-backend-pip `
  --policy-arn arn:aws:iam::105340476573:policy/CodePipelineElasticBeanstalkPolicy
```

---

## After Fixing Permissions

1. Go back to CodePipeline console
2. Click **Release change** button
3. The pipeline will retry all stages
4. Should succeed this time! ✅

---

## Verify It Works

Once the pipeline completes successfully:
- Source stage: ✅ Green
- Build stage: ✅ Green
- Deploy stage: ✅ Green

Then test your API:
```powershell
# Get your EB URL
cd C:\Users\Quagmire\Documents\GitHub\Hack-A-Holiday\backend_test
$env:Path += ";C:\Users\Quagmire\AppData\Roaming\Python\Python313\Scripts"
eb status

# Test the API
curl http://hack-a-holiday-prod.eba-fjphuqxp.us-east-1.elasticbeanstalk.com/
```
