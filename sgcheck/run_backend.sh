#!/bin/bash
# Run the CaneSense ML backend
# Usage: bash run_backend.sh

cd "$(dirname "$0")/backend"

echo "=== Installing dependencies ==="
pip install -r requirements.txt

# Check if FINAL_SUGARCANE_DATASET.csv exists
DATA_PATH="../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv"
if [ -f "$DATA_PATH" ]; then
    echo "=== Dataset found. Running training ==="
    python train.py --data "$DATA_PATH"
else
    echo "=== Dataset not found at $DATA_PATH ==="
    echo "=== Place FINAL_SUGARCANE_DATASET.csv there and re-run ==="
fi

echo "=== Starting API server on http://localhost:8000 ==="
python app.py
