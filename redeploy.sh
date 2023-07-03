#!/bin/bash

set -e

./gradlew clean build copyCasConfiguration
systemctl stop cas
cp build/libs/cas.war ../cas/
systemctl start cas
./gradlew listTemplateViews
journalctl -fucas
