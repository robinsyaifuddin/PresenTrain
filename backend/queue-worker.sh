#!/bin/sh
# PresenTrain Background Queue Worker for Hostinger Shared Hosting
cd /home/u503475479/domains/presentrain.web.id/backend || exit 1
/usr/bin/php artisan queue:work --stop-when-empty --max-time=50 >> /dev/null 2>&1
