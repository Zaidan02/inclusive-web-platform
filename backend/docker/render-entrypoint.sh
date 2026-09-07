#!/bin/sh
set -eu

render_port="${PORT:-10000}"
sed -ri "s/^Listen [0-9]+$/Listen ${render_port}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${render_port}>/" /etc/apache2/sites-available/*.conf

if [ -z "${JWT_PRIVATE_KEY_BASE64:-}" ] || [ -z "${JWT_PUBLIC_KEY_BASE64:-}" ]; then
    echo "JWT_PRIVATE_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64 must be configured." >&2
    exit 1
fi

mkdir -p /tmp/join-jwt
printf '%s' "$JWT_PRIVATE_KEY_BASE64" | base64 -d > /tmp/join-jwt/private.pem
printf '%s' "$JWT_PUBLIC_KEY_BASE64" | base64 -d > /tmp/join-jwt/public.pem
chown root:www-data /tmp/join-jwt/private.pem /tmp/join-jwt/public.pem
chmod 640 /tmp/join-jwt/private.pem
chmod 644 /tmp/join-jwt/public.pem
export JWT_SECRET_KEY=/tmp/join-jwt/private.pem
export JWT_PUBLIC_KEY=/tmp/join-jwt/public.pem

mkdir -p /app/var/cache /app/var/log
chown -R www-data:www-data /app/var

php bin/console cache:clear --env=prod --no-warmup
php bin/console cache:warmup --env=prod
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec apache2-foreground
