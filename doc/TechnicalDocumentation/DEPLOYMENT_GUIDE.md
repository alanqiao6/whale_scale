# WhaleScale Deployment Guide

This guide walks through the full deployment process for the WhaleScale project. It assumes access to the GitLab repository and is tailored for deploying on a Duke VCM instance.

Author: Jason Fitzpatrick

## 1. Required Files

Ensure the following files exist. Copy from the main repository if needed. \
Each file has both production and development versions: \
- whale_scale/frontend/Dockerfile
- whale_scale/Dockerfile
- docker-compose.yml
- .gitlab-ci.yml
- nginx/default.conf

## 2. SSH Access To VCM

Generate an SSH key on your local machine and add it to the VCM:
```
scp ~/.ssh/gitlab_vcm.pub vcm@whale-scale.colab.duke.edu:~/gitlab_vcm.pub
```

On the VCM:
```
mkdir -p ~/.ssh
cat ~/gitlab_vcm.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
rm ~/gitlab_vcm.pub
```

Now you can SSH into the VCM with:
```
ssh -i ~/.ssh/gitlab_vcm vcm@whale-scale.colab.duke.edu
```

This is important for later when the GitLab pipeline needs to SSH into the VCM.

## 3. GitLab CI/CD Secrets

Go to GitLab > Settings > CI/CD > Variables and add:
- DJANGO_SECRET_KEY
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_HOST (usually db)
- ENVIRONMENT (e.g. dev or prod)
- PROD_ALLOWED_HOSTS
- DEV_ALLOWED_HOSTS
- PROD_DEBUG
- DEV_DEBUG
- SSH_PRIVATE_KEY
- VCM_IP
- VCM_USER
- DJANGO_SUPERUSER_PASSWORD

## 4. Install Dependencies on VCM

```
sudo apt update && sudo apt install -y git docker.io docker-compose nginx python3-certbot-nginx ufw curl postgresql postgresql-contrib
```

## 5. Docker + Firewall

```
sudo usermod -aG docker vcm
newgrp docker
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 6. Clone the Repository

Generate an ssh key on the VCM and add it to your GitLab SSH keys, then:
```
git clone git@coursework.cs.duke.edu:compsci408_2025spring/app_WhaleScale.git APP_WHALESCALE
cd APP_WHALESCALE
git checkout main  # or dev, depending on environment
```

## 7. PostgreSQL Setup

```
sudo -u postgres psql
```
Then:
```
CREATE USER whale_admin WITH PASSWORD 'ja2zyBull88';
CREATE DATABASE whale_scale WITH OWNER whale_admin;
ALTER USER whale_admin CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE whale_scale TO whale_admin;
\q
```

Edit PostgreSQL auth config:
```
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Change:
```
local   all             postgres                                peer
local   all             all                                     peer
```
to:
```
local   all             postgres                                scram-sha-256
local   all             all                                     scram-sha-256
```

Restart PostgreSQL:
```
sudo systemctl restart postgresql
```

Test:
```
psql -U whale_admin -d whale_scale -h 127.0.0.1 -W
```
You should see the `whale_scale=>` prompt.

## 8. SSL with Certbot

After nginx is running:
```
sudo certbot --nginx -d whale-scale.colab.duke.edu
```
Test renewal:
```
sudo certbot renew --dry-run
```

## 9. Test Docker Locally

```
docker-compose -f docker-compose.prod.yml up -d --build
docker ps
```

## 10. GitLab Pipeline

Push to main or dev and the pipeline will deploy automatically via .gitlab-ci.yml.

#### NOTE: All open source tools/dependencies are listed in the package.json file (frontend), and requirements.txt (backend). The GitLab pipeline handles the installation of these requirements.

## 11. Troubleshooting Tips

- Port binding issues
```
sudo systemctl stop nginx
```
- Inspect logs:
```
docker logs app_whalescale_nginx_1
docker logs app_whalescale_backend_1
```
- Check containers
```
docker ps
```
- Verify static files exist inside the container:
```
docker exec -it app_whalescale_nginx_1 ls -l /app/build
```

If something isn't working, it never hurts to restart the services:
```
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
```

---

This guide provides a complete end-to-end overview of deploying WhaleScale to a new VCM using GitLab CI/CD and Docker. For updates or environment-specific changes, replicate the .prod and .dev file conventions to ensure smooth deployment across stages.

## Bonus: Here is the information required to access my existing VCM instances:

Note: This is being hosted on my (Jason Fitzpatrick) Duke VCM host. As a graduating senior, this may not stay running for long.

### dev

#### SSH login
ssh vcm@vcm-47062.vm.duke.edu \
Pass: dEtorg4afo

#### Environment Variables
- DJANGO_SECRET_KEY - e8Vmh5U3H83s0nSWdmgnM880nfJVBFU2
- POSTGRES_DB - whale_scale
- POSTGRES_USER - whale_admin
- POSTGRES_PASSWORD - ja2zyBull88
- POSTGRES_HOST - db
- DEV_ALLOWED_HOSTS - dev-whale-scale.colab.duke.edu,localhost
- DEV_DEBUG - True
- SSH_PRIVATE_KEY - 
-----BEGIN OPENSSH PRIVATE KEY-----
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
fUnH+FChS2f/AAAACmdpdGxhYi12Y20=
-----END OPENSSH PRIVATE KEY-----
- VCM_IP - dev-whale-scale.colab.duke.edu
- VCM_USER - vcm


### prod

#### SSH login
ssh vcm@vcm-46762.vm.duke.edu \
Pass: Sticyto6ne

#### Environment Variables
- DJANGO_SECRET_KEY - e8Vmh5U3H83s0nSWdmgnM880nfJVBFU2
- POSTGRES_DB - whale_scale
- POSTGRES_USER - whale_admin
- POSTGRES_PASSWORD - ja2zyBull88
- POSTGRES_HOST - db
- PROD_ALLOWED_HOSTS - whale-scale.colab.duke.edu
- PROD_DEBUG - False
- SSH_PRIVATE_KEY - 
-----BEGIN OPENSSH PRIVATE KEY-----
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
fUnH+FChS2f/AAAACmdpdGxhYi12Y20=
-----END OPENSSH PRIVATE KEY-----
- VCM_IP - whale-scale.colab.duke.edu
- VCM_USER - vcm