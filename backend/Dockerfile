FROM node:22-alpine AS frontend-build

WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN mkdir -p /workspace/backend/public && npm run build

FROM composer:2 AS vendor

WORKDIR /app
COPY backend/ ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts \
    --ignore-platform-req=ext-pdo_pgsql

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libonig-dev \
        libpng-dev \
        libpq-dev \
        libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        mbstring \
        opcache \
        pdo_mysql \
        pdo_pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

RUN printf '%s\n' \
        '<VirtualHost *:10000>' \
        '    DocumentRoot /var/www/html/public' \
        '    ErrorLog ${APACHE_LOG_DIR}/error.log' \
        '    CustomLog ${APACHE_LOG_DIR}/access.log combined' \
        '</VirtualHost>' \
        > /etc/apache2/sites-available/000-default.conf \
    && sed -ri 's/^Listen 80$/Listen 10000/' /etc/apache2/ports.conf \
    && printf '%s\n' \
        '<Directory /var/www/html/public>' \
        '    Options FollowSymLinks' \
        '    AllowOverride All' \
        '    Require all granted' \
        '    DirectoryIndex index.php index.html' \
        '</Directory>' \
        > /etc/apache2/conf-available/laravel.conf \
    && a2enmod rewrite headers \
    && a2enconf laravel \
    && apache2ctl -t \
    && grep -q '^Listen 10000$' /etc/apache2/ports.conf \
    && grep -q 'DocumentRoot /var/www/html/public' /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html
COPY backend/ ./
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend-build /workspace/backend/public/build ./public/build

RUN test -f public/index.php \
    && test -f public/.htaccess \
    && test -f public/build/index.html \
    && test -d public/build/assets \
    && mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && php artisan package:discover --ansi \
    && php artisan storage:link --force

EXPOSE 10000

CMD ["sh", "-c", "chown -R www-data:www-data /var/www/html/storage/app && exec apache2-foreground"]
