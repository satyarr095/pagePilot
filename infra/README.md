# PagePilot — AWS Deployment

Infrastructure-as-Code (Terraform) deployment of PagePilot to AWS. The production stack runs on ECS Fargate with RDS PostgreSQL, S3 for file storage, EFS for ChromaDB persistence, and CloudFront as the CDN.

## Architecture

```
                          ┌──────────────────┐
                          │   CloudFront CDN  │
                          │  (HTTPS termination)│
                          └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │ /            │  /api/*       │
                    ▼              │               ▼
            ┌──────────────┐      │      ┌──────────────────┐
            │  S3 Bucket   │      │      │   ALB (public)   │
            │  (frontend)  │      │      │   port 80        │
            └──────────────┘      │      └────────┬─────────┘
                                  │               │
                                  │               ▼
                                  │      ┌──────────────────┐
                                  │      │  ECS Fargate     │
                                  │      │  (private subnet)│
                                  │      │  FastAPI :8000   │
                                  │      └──┬─────┬────┬────┘
                                  │         │     │    │
                              ┌───┘    ┌────┘     │    └────┐
                              │        │          │         │
                              ▼        ▼          ▼         ▼
                         ┌────────┐ ┌──────┐ ┌────────┐ ┌────────────┐
                         │  EFS   │ │  RDS │ │   S3   │ │  Secrets   │
                         │ChromaDB│ │Postgres│ │Uploads│ │  Manager   │
                         └────────┘ └──────┘ └────────┘ └────────────┘
```

## AWS Services Used

| Service | Resource | Purpose |
|---------|----------|---------|
| **VPC** | 1 VPC, 2 public + 2 private subnets, NAT Gateway | Network isolation |
| **ECS Fargate** | 1 cluster, 1 service (1 vCPU / 2 GB) | Runs the FastAPI backend |
| **ECR** | `pagepilot-api` repository | Docker image registry |
| **RDS** | PostgreSQL 16.6, `db.t3.micro` | Relational database |
| **S3** | `pagepilot-uploads-*` (versioned, encrypted) | PDF file storage |
| **S3** | `pagepilot-frontend-*` (static website) | Frontend hosting |
| **EFS** | Encrypted filesystem + access point | ChromaDB vector persistence |
| **ALB** | Application Load Balancer, public subnets | Routes traffic to ECS |
| **CloudFront** | Distribution with S3 + ALB origins | CDN, HTTPS, SPA routing |
| **Secrets Manager** | `pagepilot-app-secrets` | OpenAI key + DB credentials |
| **IAM** | ECS execution role + task role | Least-privilege access |
| **CloudWatch** | `/ecs/pagepilot-api` log group (30 day retention) | Container logs |

## Live Endpoints

| Resource | URL |
|----------|-----|
| Frontend | `https://daqpw6pocqhjr.cloudfront.net` |
| API (via CloudFront) | `https://daqpw6pocqhjr.cloudfront.net/api/v1` |
| API (via ALB direct) | `http://pagepilot-alb-516022278.ap-south-1.elb.amazonaws.com/api/v1` |
| Health check | `https://daqpw6pocqhjr.cloudfront.net/api/v1/health` |

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with credentials
- [Docker](https://www.docker.com/products/docker-desktop/) with buildx support
- IAM user with `AdministratorAccess` or `PowerUserAccess` + `IAMFullAccess`

## Terraform Files

```
infra/
  main.tf              Provider config, locals, data sources
  variables.tf         Input variables (region, DB creds, instance sizes)
  vpc.tf               VPC, subnets, NAT, route tables
  security_groups.tf   ALB, ECS, RDS, EFS security groups
  rds.tf               PostgreSQL instance + subnet group
  s3.tf                Upload bucket + frontend static bucket
  efs.tf               EFS filesystem + mount targets + access point
  ecr.tf               Docker image repository
  iam.tf               ECS execution + task IAM roles and policies
  secrets.tf           Secrets Manager secret with DB + OpenAI credentials
  alb.tf               Application Load Balancer + target group + listener
  ecs.tf               ECS cluster, task definition, service
  cloudfront.tf        CloudFront distribution (S3 + ALB origins)
  cloudwatch.tf        Log group for ECS containers
  outputs.tf           Exported resource identifiers and URLs
  terraform.tfvars     Variable values (gitignored, contains secrets)
```

## Deploy from Scratch

### 1. Configure AWS CLI

```bash
aws configure
# Region: ap-south-1
# Output: json
```

### 2. Set Terraform variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region     = "ap-south-1"
db_password    = "YourSecurePasswordHere"
openai_api_key = "sk-your-openai-key"
```

### 3. Initialize and apply Terraform

```bash
terraform init
terraform plan        # review the 48 resources
terraform apply       # ~10 min (RDS + CloudFront are slow)
```

Save the outputs:

```bash
terraform output
```

### 4. Build and push the backend Docker image

The image must target `linux/amd64` (Fargate runtime):

```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  $(terraform output -raw ecr_repository_url | cut -d/ -f1)

# Build for amd64 and push
docker buildx build \
  --platform linux/amd64 \
  -t $(terraform output -raw ecr_repository_url):latest \
  -f ../backend/Dockerfile \
  --push ../backend/
```

### 5. Force ECS to deploy the new image

```bash
aws ecs update-service \
  --cluster pagepilot-cluster \
  --service pagepilot-api \
  --force-new-deployment \
  --region ap-south-1
```

Monitor until `runningCount` = 1:

```bash
watch -n 10 'aws ecs describe-services \
  --cluster pagepilot-cluster \
  --services pagepilot-api \
  --region ap-south-1 \
  --query "services[0].{desired:desiredCount,running:runningCount,rollout:deployments[0].rolloutState}"'
```

### 6. Build and deploy the frontend

```bash
cd ../frontend

VITE_API_URL="https://$(cd ../infra && terraform output -raw cloudfront_domain)/api/v1" \
  npm run build

aws s3 sync dist/ s3://$(cd ../infra && terraform output -raw s3_frontend_bucket)/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd ../infra && terraform output -raw cloudfront_domain | xargs -I{} \
    aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='{}'].Id" --output text) \
  --paths "/*"
```

### 7. Verify

```bash
curl https://$(cd ../infra && terraform output -raw cloudfront_domain)/api/v1/health
# {"status":"ok"}
```

## Updating the Backend

After code changes:

```bash
cd infra

# Rebuild + push image
docker buildx build \
  --platform linux/amd64 \
  -t $(terraform output -raw ecr_repository_url):latest \
  -f ../backend/Dockerfile \
  --push ../backend/

# Rolling deploy
aws ecs update-service \
  --cluster pagepilot-cluster \
  --service pagepilot-api \
  --force-new-deployment \
  --region ap-south-1
```

## Updating the Frontend

After code changes:

```bash
cd frontend
VITE_API_URL="https://daqpw6pocqhjr.cloudfront.net/api/v1" npm run build
aws s3 sync dist/ s3://pagepilot-frontend-759802535870/ --delete
aws cloudfront create-invalidation --distribution-id E9H2RCC14RF04 --paths "/*"
```

## Monitoring

### Container logs

```bash
aws logs tail /ecs/pagepilot-api --follow --region ap-south-1
```

### ECS service events

```bash
aws ecs describe-services \
  --cluster pagepilot-cluster \
  --services pagepilot-api \
  --region ap-south-1 \
  --query 'services[0].events[:10]'
```

### RDS connection test

The RDS instance is in a private subnet and only accessible from within the VPC (i.e., from the ECS task). To debug:

```bash
# Check ECS task logs for DB connection errors
aws logs get-log-events \
  --log-group-name /ecs/pagepilot-api \
  --log-stream-name "api/api/<task-id>" \
  --region ap-south-1 \
  --query 'events[*].message'
```

## Tearing Down

To destroy all AWS resources:

```bash
cd infra
terraform destroy
```

This removes all 48 resources including the database (RDS has `skip_final_snapshot = true`), S3 buckets (with `force_destroy = true`), and the ECR repository.

## Cost Estimate

Approximate monthly cost for the current configuration (ap-south-1):

| Service | Spec | ~Cost/month |
|---------|------|-------------|
| ECS Fargate | 1 vCPU, 2 GB, 1 task | ~$30 |
| RDS PostgreSQL | db.t3.micro, 20 GB gp3 | ~$15 |
| NAT Gateway | 1 NAT + data processing | ~$35 |
| ALB | 1 ALB + LCUs | ~$18 |
| EFS | Pay-per-use (ChromaDB) | ~$1-5 |
| S3 | Minimal storage | ~$1 |
| CloudFront | Free tier covers light traffic | ~$0 |
| Secrets Manager | 1 secret | ~$0.40 |
| **Total** | | **~$100-105/month** |

To reduce costs: consider using a NAT instance instead of NAT Gateway (~$4/month vs ~$35), or placing ECS in public subnets to eliminate NAT entirely for non-production workloads.
