# 🚀 Optimized MERN Stack Deployment with Docker & GitHub Actions

This repository contains the automated deployment pipeline for a production-ready MERN (MongoDB, Express, React, Node) stack application hosted on an resource-constrained **AWS EC2 t3.micro** instance with an **8 GB Elastic Block Store (EBS)** volume.

The architecture is highly optimized to run smoothly within a **1 GiB RAM** budget without requiring external paid container registries (like AWS ECR or Docker Hub) by compiling code directly on-site and aggressively cleaning up historical Docker layers instantly upon build completion.

---

## 📋 Table of Contents

1. [AWS EC2 Instance Setup (Mumbai Region)](https://www.google.com/search?q=%231-aws-ec2-instance-setup-mumbai-region)
2. [EC2 Server Environment & Docker Configuration](https://www.google.com/search?q=%232-ec2-server-environment--docker-configuration)
3. [Memory & Storage Optimization (Critical)](https://www.google.com/search?q=%233-memory--storage-optimization-critical)
4. [GitHub Actions Workflow Configuration](https://www.google.com/search?q=%234-github-actions-workflow-configuration)
5. [GitHub Repository Secrets Setup](https://www.google.com/search?q=%235-github-repository-secrets-setup)
6. [Troubleshooting & Verification](https://www.google.com/search?q=%236-troubleshooting--verification)

---

## 1. AWS EC2 Instance Setup (Mumbai Region)

### Instance Provisioning Profile

* **Region:** Asia Pacific (Mumbai) `ap-south-1`
* **Amazon Machine Image (AMI):** Ubuntu Server 24.04 LTS (64-bit, x86)
* **Instance Type:** `t3.micro` (2 vCPUs, 1 GiB RAM)
* **Storage (EBS):** 1 x 8 GB GP3 (General Purpose SSD) Root Volume
* **Credit Specification:** Set CPU Credits to **Standard** (Recommended to prevent unexpected burst charges during long Docker multi-stage compiles).

### Security Group Inbound Rules

Configure your instance's Security Group with the following inbound rules to allow secure administrative access and application traffic:

| Type | Protocol | Port Range | Source | Description |
| --- | --- | --- | --- | --- |
| **SSH** | TCP | `22` | `My IP` or `0.0.0.0/0` | Administrative Remote Terminal Access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Client Web Traffic (Nginx Reverse Proxy / Frontend) |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Secure SSL Web Traffic |
| **Custom TCP** | TCP | `3000` | `0.0.0.0/0` | React Development Client (If exposed directly) |
| **Custom TCP** | TCP | `5000` | `0.0.0.0/0` | Node.js Backend API Server (If exposed directly) |

---

## 2. EC2 Server Environment & Docker Configuration

Connect to your EC2 instance via SSH and execute the following installation blocks to set up Docker Engine, Docker Compose, and establish appropriate execution permissions.

### A. Repository Setup & GPG Verification

```bash
# Update the local package index
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl

# Create directory for Docker's official GPG keyring
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources dynamically
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# Refresh package lists with new repository records
sudo apt update

```

### B. Install Docker Components

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

```

### C. Configure Non-Root Permissions (Fixes Socket Permission Denied Errors)

To prevent the common `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock` error during automated GitHub Actions SSH sessions, grant the `ubuntu` user non-root execution permissions:

```bash
# 1. Create the docker group (if it doesn't already exist)
sudo groupadd docker

# 2. Add your 'ubuntu' user to the docker group
sudo usermod -aG docker ubuntu

# 3. Apply the group modifications to the active session
newgrp docker

# 4. CRITICAL: Restart the system service daemon to update external SSH endpoints
sudo systemctl restart docker

```

### D. Verify Installation Status

```bash
# Ensure the Docker system service is operational and enabled on boot
sudo systemctl status docker --no-pager

# Test execution without sudo privileges
docker ps

```

---

## 3. Memory & Storage Optimization (Critical)

Because a `t3.micro` instance only possesses **1 GiB of physical RAM** and an **8 GB drive**, running MongoDB, an Express backend, and building a production React frontend simultaneously will trigger Out-Of-Memory (OOM) segmentations and fill the local disk.

Run the following scripts directly on your EC2 terminal to optimize resource overhead:

### A. Allocate Virtual Memory (Swap Space)

We will convert 2 GB of your 8 GB EBS storage into a Swap File to act as supplemental virtual RAM for memory spikes during container compilation:

```bash
# Create a 2 Gigabyte contiguous swap storage block
sudo fallocate -l 2G /swapfile

# Lock permissions down strictly to root users
sudo chmod 600 /swapfile

# Format the storage file into a Swap partition
sudo mkswap /swapfile

# Activate the swap spacing instantly
sudo swapon /swapfile

# Ensure the configuration persists across operating system reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify allocation matrices
free -h

```

---

## 4. GitHub Actions Workflow Configuration

Create a file exactly under `.github/workflows/deploy.yaml` within your local codebase. This configuration bypasses remote image repository storage limits by pulling raw delta commits instantly into your EC2 workspace and building inside the host while executing immediate garbage collection routines.

```yaml
name: Deploy MERN App to AWS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.5
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          script: |
            # 1. Navigate to the local repository directory
            cd /home/ubuntu/mern-deploy-demo

            # 2. Synchronize codebase with remote origin minimizing storage tracking
            git pull origin main

            # 3. Compile, rebuild and scale up container clusters detached backgrounding
            docker compose up --build -d

            # 4. STORAGE LIFESAVER: Aggressively purge dangling and unused image caches
            # This completely strips out historical cache blocks to maintain an 8GB storage ceiling.
            docker system prune -a -f

```

---

## 5. GitHub Repository Secrets Setup

To grant your automation framework secure pipeline communication channels, declare the following access variables inside your GitHub settings panel (**Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ **New repository secret**):

1. `SSH_HOST`
* **Value:** The Public IPv4 address or Public IPv4 DNS name of your AWS EC2 instance.


2. `SSH_KEY`
* **Value:** The absolute text contents of your private identity key file (`.pem` format issued during EC2 key-pair establishment). Include both the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` strings.



---

## 6. Troubleshooting & Verification

If your CI/CD runner crashes during execution, connect manually to your host environment and monitor container metrics using these commands:

```bash
# Check standard diagnostic outputs of active running microservices
docker compose ps

# Review diagnostic logs for the database or web nodes
docker compose logs --tail=50 client
docker compose logs --tail=50 server
docker compose logs --tail=50 mongo

# Inspect actual disk volume layout metrics
df -h

# Check operational memory tracking
free -m

```