#! /bin/bash

# cp /home/docker/nginx.conf /opt/nginx/conf/domains/

# mkdir -p /export/Logs/servers/nginx/logs
# sudo mkdir -p /var/cache/nginx/client_temp
cp /home/docker/nginx.conf /etc/nginx/nginx.conf

sudo /usr/sbin/nginx

npm i pnpm -g --registry=http://registry.m.jd.com/
pnpmVersion=$(pnpm -v)
echo "pnpm version: $pnpmVersion"

# 配置 pnpm 使用正确的 registry
pnpm config set registry http://registry.m.jd.com/

cd /home/ && pnpm i --registry=http://registry.m.jd.com/
echo "pnpm dependencies installed"

cd /home/ && pnpm run build
echo "pnpm build completed"

cd /home/ && pnpm run start
