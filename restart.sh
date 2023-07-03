#!/bin/bash

set -e

systemctl restart cas
journalctl -fucas
