#!/usr/bin/env bash
# ==============================================================================
# Deltachem Server 1-Click Setup Script (Ubuntu / Debian / CentOS)
# ==============================================================================
set -e

echo "=========================================="
echo "  Setting up Deltachem Production Server  "
echo "=========================================="

# Update system packages
if [ -f /etc/debian_version ]; then
  sudo apt-get update -y && sudo apt-get upgrade -y
  sudo apt-get install -y curl git ufw
elif [ -f /etc/redhat-release ]; then
  sudo yum update -y
  sudo yum install -y curl git
fi

# Install Docker & Docker Compose if not already installed
if ! command -v docker > /dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
fi

# Setup deployment directory
DEPLOY_PATH="/var/www/deltachem"
echo "Creating deployment directory at $DEPLOY_PATH..."
sudo mkdir -p $DEPLOY_PATH
sudo chown -R $USER:$USER $DEPLOY_PATH

# Configure Firewall (Allow SSH, HTTP, HTTPS)
if command -v ufw > /dev/null 2>&1; then
  echo "Configuring firewall..."
  sudo ufw allow 22/tcp || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw --force enable || true
fi

echo "=========================================="
echo "✅ Server Setup Complete!"
echo "You are now ready to deploy via GitHub Actions or Docker Compose."
echo "Deployment Path: $DEPLOY_PATH"
echo "=========================================="
