#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# List available billing accounts
echo "Listing available billing accounts..."
gcloud billing accounts list

echo -e "\n"
echo "Please copy the ACCOUNT_ID of the desired billing account from the list above."
echo "Then, run the following command to link the billing account to your project:"
echo -e "\n"
echo "gcloud billing projects link plannyc-12345 --billing-account ACCOUNT_ID"
echo -e "\n"
echo "Replace ACCOUNT_ID with the actual ID from the list."