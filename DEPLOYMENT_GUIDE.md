# WhaleScale Deployment Guide

This guide walks through the full deployment process for the WhaleScale project. It assumes access to the GitLab repository and is tailored for deploying on a Duke VCM instance.

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

---

This guide provides a complete end-to-end overview of deploying WhaleScale to a new VCM using GitLab CI/CD and Docker. For updates or environment-specific changes, replicate the .prod and .dev file conventions to ensure smooth deployment across stages.