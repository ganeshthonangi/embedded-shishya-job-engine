name: Embedded Job Engine

on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest
    env:
      GOOGLE_SERVICE_ACCOUNT: ${{ secrets.GOOGLE_SERVICE_ACCOUNT }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: node crawler.js
