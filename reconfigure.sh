#!/bin/bash

set -e

./gradlew copyCasConfiguration
systemctl restart cas
journalctl -fucas
