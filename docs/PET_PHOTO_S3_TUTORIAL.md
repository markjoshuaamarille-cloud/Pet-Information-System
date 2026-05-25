# Pet Photo Upload to AWS S3 (Step-by-Step)

This guide explains how to set up S3 for optional pet photos in this app, starting with a personal AWS account and later moving to company AWS.

## 1) Personal AWS Setup (Temporary)

### Step 1: Log in

1. Go to [https://aws.amazon.com/console/](https://aws.amazon.com/console/).
2. Sign in to your AWS account.
3. Open **S3** from the AWS Console search bar.

### Step 2: Create an S3 bucket

1. Click **Create bucket**.
2. Enter a globally unique name, for example: `pet-info-system-dev-yourname-001`.
3. Choose a region close to your app users (example: `ap-southeast-1`).
4. Keep **Block all public access** enabled.
5. Create the bucket.

### Step 3: Create an IAM user for app uploads

1. Open **IAM** service.
2. Go to **Users** > **Create user**.
3. Name: `pet-info-system-uploader`.
4. Select **Programmatic access** (Access key).
5. Continue and attach a custom policy (next step).

### Step 4: Create least-privilege IAM policy

Create this policy and replace `<YOUR_BUCKET_NAME>` with your bucket name:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ListPetsPrefix",
            "Effect": "Allow",
            "Action": ["s3:ListBucket"],
            "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>",
            "Condition": {
                "StringLike": {
                    "s3:prefix": ["pets/*"]
                }
            }
        },
        {
            "Sid": "ManagePetPhotos",
            "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
            "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>/pets/*"
        }
    ]
}
```

Attach this policy to the IAM user.

### Step 5: Generate and save keys

1. Create an **Access key** for that IAM user.
2. Copy:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
3. Save securely (password manager). Do not commit to git.

## 2) Laravel App Configuration

In your local `.env`:

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=your_bucket_name
AWS_URL=
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=false
```

Then clear config cache:

```bash
php artisan config:clear
```

## 3) Required PHP Package

Install S3 Flysystem driver if not already installed:

```bash
composer require league/flysystem-aws-s3-v3
```

## 4) Verification Checklist

1. Open `/pets`.
2. Create pet without photo (should pass).
3. Create pet with photo (jpg/png/webp).
4. Confirm photo appears in pets table.
5. Edit pet and upload another photo.
6. Confirm old photo is replaced and new photo is shown.

## 5) Move to Company AWS Later

When migrating to company AWS:

1. Create a company bucket and IAM user/role with the same permissions.
2. Replace `.env` AWS values in the deployment environment.
3. Keep app code unchanged.

## 6) Do You Need an API Key?

For S3 access from Laravel, you need AWS credentials:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

These are the app credentials for an IAM user/role. Do not use root account credentials.

============================
AWS S3 step-by-step (personal now, company later)
I also documented this in docs/PET_PHOTO_S3_TUTORIAL.md.

1. Personal AWS (temporary)
   Log in to AWS Console.
   Go to S3 → create bucket:
   unique name
   choose region (keep fixed)
   keep public access blocked
   Go to IAM → create IAM user for app upload (programmatic access).
   Attach least-privilege policy for only pets/\* in your bucket (Put/Get/DeleteObject, ListBucket with prefix).
   Generate Access Key + Secret Key and store securely.
2. App config
   Set in .env:

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
optional: AWS_URL, AWS_ENDPOINT
Then run:

php artisan config:clear
php artisan migrate 3) Verify
Create pet without photo (should still work).
Create pet with photo.
Edit pet with new photo (old one replaced).
Delete pet (photo removed from S3). 4) Move to company AWS later
Create new bucket + IAM policy/user (or IAM role).
Replace only environment variables in deployment.
No app code changes needed.
