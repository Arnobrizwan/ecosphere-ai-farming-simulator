# Quick Start: Training the Disease Detection Model

## Issue Fixed ✅

The Kaggle API error has been resolved. The training script now:
- Uses the correct `kagglehub` API
- Falls back to `kaggle` API if needed
- Provides better error messages

## Setup Steps

### 1. Update Dependencies

```bash
cd model-training
source venv/bin/activate  # Activate your existing venv
pip install --upgrade kaggle
```

### 2. Verify Kaggle Credentials

Make sure `~/.kaggle/kaggle.json` exists:

```bash
cat ~/.kaggle/kaggle.json
```

Should contain:
```json
{
  "username": "your_username",
  "key": "your_api_key"
}
```

If missing, download from: https://www.kaggle.com/settings → API → Create New Token

### 3. Run Training

```bash
python train_disease_model.py
```

## Expected Output

```
================================================================================
UC21 - CROP DISEASE DETECTION MODEL TRAINING
================================================================================

[1/6] Downloading PlantDisease dataset from Kaggle...
✓ Dataset downloaded to: /path/to/dataset

[2/6] Setting up data preprocessing and augmentation...
✓ Found 32 disease classes
✓ Training samples: 54303
✓ Validation samples: 13576

[3/6] Building MobileNetV2 transfer learning model...
✓ Model compiled with 3,812,774 parameters

[4/6] Training model...
Epoch 1/25
...

[5/6] Evaluating model performance...
✓ Validation Accuracy: 87.34%

[6/6] Converting model to TensorFlow Lite...
✓ TFLite model saved to ../assets/models/plant_disease_model.tflite
✓ Model size: 8.43 MB
```

## If It Still Fails

### Manual Download Option

1. Download dataset manually:
   - Visit: https://www.kaggle.com/datasets/emmarex/plantdisease
   - Click "Download" (requires Kaggle login)
   - Extract to: `model-training/dataset/`

2. Update script to use local path:
   ```python
   # In train_disease_model.py, line 58:
   dataset_path = str(SCRIPT_DIR / 'dataset')
   ```

3. Run training again

## Testing the App

Once training completes:

```bash
# Back to project root
cd ..

# Start app
npm start
```

Navigate: Dashboard → 🔬 Disease Detection → Take/Select Photo → Detect!

## Troubleshooting

**Error: "No module named 'kaggle'"**
```bash
pip install kaggle
```

**Error: "Permission denied"**
```bash
chmod 600 ~/.kaggle/kaggle.json
```

**Error: "Out of memory"**
- Reduce `BATCH_SIZE` in script from 32 to 16
- Close other applications

## Quick Test Without Training

If you want to test the UI without training:
1. The app will work with placeholder model
2. Detection will use a fallback MobileNetV2
3. Results may not be accurate but UI will function

---

Happy training! 🌱
