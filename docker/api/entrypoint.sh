#!/bin/sh
set -e

if [ "${SIGHTLINE_SKIP_MIGRATIONS:-0}" != "1" ]; then
  python manage.py migrate --noinput
fi

if [ "${SIGHTLINE_COLLECTSTATIC:-1}" = "1" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
