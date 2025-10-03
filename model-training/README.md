# UC21 - Crop Disease Detection Model Training

This directory contains the model training pipeline for the EcoSphere AI Farming Simulator's crop disease detection feature (UC21).

## Overview

The training script downloads the PlantDisease dataset from Kaggle, trains a MobileNetV2-based transfer learning model, and exports it as TensorFlow Lite for mobile deployment in React Native.

## Prerequisites

### 1. Python Environment
- Python 3.8 or higher
- pip package manager

### 2. Kaggle API Credentials

You need Kaggle API credentials to download the dataset:

1. Create a Kaggle account at https://www.kaggle.com
2. Go to Account Settings → API → Create New API Token
3. This downloads `kaggle.json` with your credentials
4. Place it in the correct location:

**Linux/Mac:**
```bash
mkdir -p ~/.kaggle
mv ~/Downloads/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json
```

**Windows:**
```cmd
mkdir %USERPROFILE%\.kaggle
move %USERPROFILE%\Downloads\kaggle.json %USERPROFILE%\.kaggle\
```

### 3. Hardware Requirements

**Minimum:**
- 8GB RAM
- 10GB free disk space
- CPU training: ~2-4 hours

**Recommended:**
- 16GB+ RAM
- NVIDIA GPU with CUDA support
- GPU training: ~20-40 minutes

## Installation

### Step 1: Create Virtual Environment

```bash
# Navigate to model-training directory
cd model-training

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: (Optional) GPU Setup

If you have an NVIDIA GPU and want to use it:

```bash
# Install CUDA-enabled TensorFlow
pip uninstall tensorflow
pip install tensorflow[and-cuda]==2.15.0

# Verify GPU is detected
python -c "import tensorflow as tf; print('GPUs:', tf.config.list_physical_devices('GPU'))"
```

## Training the Model

### Run Training Script

```bash
python train_disease_model.py
```

### Training Process

The script performs the following steps:

1. **Download Dataset** - Downloads PlantDisease dataset from Kaggle (~2GB)
2. **Preprocess Data** - Resizes images to 224x224, applies augmentation
3. **Build Model** - Creates MobileNetV2 transfer learning architecture
4. **Train Model** - Trains for up to 25 epochs with early stopping
5. **Evaluate Performance** - Tests on validation set (target: >85% accuracy)
6. **Convert to TFLite** - Optimizes and converts to mobile format
7. **Generate Assets** - Creates labels.json and treatments.json

### Expected Output

After successful training, you'll find these files in `../assets/models/`:

```
assets/models/
├── plant_disease_model.tflite  # Mobile-optimized model (<20MB)
├── labels.json                  # Class index to disease name mapping
└── treatments.json              # Treatment recommendations per disease
```

### Training Logs Example

```
==============================================================================
UC21 - CROP DISEASE DETECTION MODEL TRAINING
==============================================================================

[1/6] Downloading PlantDisease dataset from Kaggle...
✓ Dataset downloaded to: /root/.cache/kagglehub/...

[2/6] Setting up data preprocessing and augmentation...
✓ Found 38 disease classes
✓ Training samples: 54303
✓ Validation samples: 13576

[3/6] Building MobileNetV2 transfer learning model...
✓ Model compiled with 3,812,774 parameters

[4/6] Training model...
Epoch 1/25
1697/1697 [==============================] - 234s 138ms/step
...
Epoch 15/25
1697/1697 [==============================] - 198s 117ms/step
✓ Early stopping triggered (best epoch: 12)

[5/6] Evaluating model performance...
✓ Validation Accuracy: 87.34%
✓ Top-3 Accuracy: 96.12%
✓ Target accuracy achieved!

[6/6] Converting model to TensorFlow Lite...
✓ TFLite model saved to ../assets/models/plant_disease_model.tflite
✓ Model size: 8.43 MB

==============================================================================
TRAINING COMPLETE!
==============================================================================
Model Accuracy: 87.34%
Top-3 Accuracy: 96.12%
Model Size: 8.43 MB
Classes: 38
```

## Model Architecture

### Base Model
- **MobileNetV2** - Efficient CNN for mobile/edge devices
- Pre-trained on ImageNet
- Frozen during initial training

### Custom Head
```
GlobalAveragePooling2D
Dropout(0.3)
Dense(512, relu) + BatchNorm
Dropout(0.4)
Dense(256, relu) + BatchNorm
Dropout(0.3)
Dense(num_classes, softmax)
```

### Training Configuration
- **Optimizer:** Adam (lr=0.0001)
- **Loss:** Categorical Crossentropy
- **Metrics:** Accuracy, Top-3 Accuracy
- **Image Size:** 224x224 RGB
- **Batch Size:** 32
- **Epochs:** 25 (with early stopping)

### Data Augmentation
- Rotation: ±20°
- Width/Height Shift: 20%
- Horizontal/Vertical Flip
- Zoom: 20%
- Shear: 20%

## Dataset Information

**Source:** [PlantDisease Dataset on Kaggle](https://www.kaggle.com/datasets/emmarex/plantdisease)

**Classes:** 38 disease categories including:
- Healthy plants
- Bacterial infections
- Fungal diseases
- Viral diseases
- Nutrient deficiencies

**Total Images:** ~87,000 images
- Training: ~70,000 images
- Validation: ~17,000 images

## Performance Metrics

### Target Metrics
- ✓ Accuracy: >85%
- ✓ Top-3 Accuracy: >90%
- ✓ Model Size: <20MB
- ✓ Inference Time: <3s on mobile

### Typical Results
- **Validation Accuracy:** 85-92%
- **Top-3 Accuracy:** 95-98%
- **Model Size:** 7-12 MB
- **Mobile Inference:** 1-2 seconds

## Troubleshooting

### Issue: "Dataset download failed"
**Solution:** Check Kaggle credentials in `~/.kaggle/kaggle.json`

### Issue: "Out of memory error"
**Solution:** Reduce `BATCH_SIZE` in script (try 16 or 8)

### Issue: "Accuracy below target"
**Solution:**
- Increase `EPOCHS` to 30-40
- Unfreeze base_model and fine-tune
- Increase training data with more augmentation

### Issue: "Model size too large"
**Solution:**
- Use more aggressive quantization (int8)
- Reduce Dense layer sizes (512→256, 256→128)
- Apply pruning techniques

### Issue: "Training too slow"
**Solution:**
- Use GPU if available
- Reduce image resolution (224→192)
- Use fewer augmentation techniques

## Advanced Usage

### Fine-Tuning Base Model

After initial training, you can unfreeze MobileNetV2 layers:

```python
# Unfreeze last 20 layers of base model
base_model.trainable = True
for layer in base_model.layers[:-20]:
    layer.trainable = False

# Recompile with lower learning rate
model.compile(
    optimizer=keras.optimizers.Adam(1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Continue training
model.fit(train_generator, validation_data=validation_generator, epochs=10)
```

### Export Additional Formats

```python
# Save as SavedModel format
model.save('saved_model/')

# Save as h5
model.save('model.h5')

# Convert to ONNX (requires tf2onnx)
import tf2onnx
onnx_model = tf2onnx.convert.from_keras(model)
```

### Visualize Training History

```python
import matplotlib.pyplot as plt

plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Val Accuracy')
plt.legend()
plt.savefig('training_history.png')
```

## Integration with React Native

After training completes, the model files are automatically saved to `../assets/models/`.

Follow these steps to integrate with the mobile app:

1. ✓ Model files are already in correct location
2. Install React Native dependencies: `npm install`
3. Run the app: `npm start`
4. The model will auto-load on app startup

See main project README for mobile app setup instructions.

## References

- [MobileNetV2 Paper](https://arxiv.org/abs/1801.04381)
- [TensorFlow Lite Guide](https://www.tensorflow.org/lite)
- [Transfer Learning Tutorial](https://www.tensorflow.org/tutorials/images/transfer_learning)
- [PlantDisease Dataset](https://www.kaggle.com/datasets/emmarex/plantdisease)

## License

This training code is part of the EcoSphere AI Farming Simulator project.

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review TensorFlow/Keras documentation
3. Open an issue in the main project repository

---

**Last Updated:** 2025-01-02
**Model Version:** 1.0
**Framework:** TensorFlow 2.15.0
