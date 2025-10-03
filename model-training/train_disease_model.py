"""
UC21 - Crop Disease Detection Model Training Script

This script downloads the PlantDisease dataset from Kaggle, trains a MobileNetV2-based
transfer learning model, and exports it as TensorFlow Lite for mobile deployment.

Requirements:
- Python 3.8+
- TensorFlow 2.x
- kagglehub
- See requirements.txt for full dependencies

Output:
- plant_disease_model.tflite (mobile-optimized model)
- labels.json (class index to disease name mapping)
- treatments.json (disease-specific treatment recommendations)
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import kagglehub
from pathlib import Path
import shutil

# Configuration
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 25
LEARNING_RATE = 0.0001
VALIDATION_SPLIT = 0.2
TARGET_ACCURACY = 0.85

# Paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / 'assets' / 'models'
MODEL_SAVE_PATH = OUTPUT_DIR / 'plant_disease_model.tflite'
LABELS_PATH = OUTPUT_DIR / 'labels.json'
TREATMENTS_PATH = OUTPUT_DIR / 'treatments.json'

# Create output directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80)
print("UC21 - CROP DISEASE DETECTION MODEL TRAINING")
print("=" * 80)

# Step 1: Download Dataset from Kaggle
print("\n[1/6] Downloading PlantDisease dataset from Kaggle...")
print("This may take 5-10 minutes for a ~2GB dataset...")

dataset_path = None

try:
    # Method 1: Try kagglehub (newest API)
    print("Trying kagglehub.dataset_download()...")
    dataset_path = kagglehub.dataset_download("emmarex/plantdisease")
    print(f"✓ Dataset downloaded via kagglehub to: {dataset_path}")
except Exception as e1:
    print(f"⚠ kagglehub failed: {e1}")

    # Method 2: Fallback to kaggle API
    try:
        print("Trying fallback: kaggle API...")
        import kaggle
        kaggle.api.authenticate()
        download_path = str(SCRIPT_DIR / 'dataset')
        os.makedirs(download_path, exist_ok=True)
        kaggle.api.dataset_download_files('emmarex/plantdisease', path=download_path, unzip=True)
        dataset_path = download_path
        print(f"✓ Dataset downloaded via kaggle API to: {dataset_path}")
    except Exception as e2:
        print(f"✗ Both methods failed!")
        print(f"  - kagglehub error: {e1}")
        print(f"  - kaggle API error: {e2}")
        print("\n📋 Please ensure Kaggle credentials are configured:")
        print("  1. Check ~/.kaggle/kaggle.json exists")
        print("  2. Verify contents: {\"username\":\"your_username\",\"key\":\"your_api_key\"}")
        print("  3. Check permissions: chmod 600 ~/.kaggle/kaggle.json")
        print("\n💡 Alternative: Manual download")
        print("  1. Visit: https://www.kaggle.com/datasets/emmarex/plantdisease")
        print("  2. Download and extract to: model-training/dataset/")
        exit(1)

if not dataset_path or not Path(dataset_path).exists():
    print(f"✗ Dataset path invalid or doesn't exist: {dataset_path}")
    exit(1)

# Find the actual data directory (navigate through downloaded structure)
data_dir = Path(dataset_path)
if (data_dir / 'PlantVillage').exists():
    data_dir = data_dir / 'PlantVillage'
elif (data_dir / 'train').exists():
    data_dir = data_dir

print(f"Using data directory: {data_dir}")

# Step 2: Data Preprocessing & Augmentation
print("\n[2/6] Setting up data preprocessing and augmentation...")

# Training data with augmentation
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True,
    vertical_flip=True,
    zoom_range=0.2,
    shear_range=0.2,
    fill_mode='nearest',
    validation_split=VALIDATION_SPLIT
)

# Validation data (no augmentation, only rescaling)
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=VALIDATION_SPLIT
)

# Load training data
train_generator = train_datagen.flow_from_directory(
    data_dir,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

# Load validation data
validation_generator = val_datagen.flow_from_directory(
    data_dir,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

num_classes = len(train_generator.class_indices)
print(f"✓ Found {num_classes} disease classes")
print(f"✓ Training samples: {train_generator.samples}")
print(f"✓ Validation samples: {validation_generator.samples}")

# Save class labels
class_labels = {v: k for k, v in train_generator.class_indices.items()}
with open(LABELS_PATH, 'w') as f:
    json.dump(class_labels, f, indent=2)
print(f"✓ Saved labels to {LABELS_PATH}")

# Step 3: Build Model Architecture
print("\n[3/6] Building MobileNetV2 transfer learning model...")

# Load pre-trained MobileNetV2 (without top layers)
base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)

# Freeze base model layers
base_model.trainable = False

# Build custom classification head
model = keras.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.3),
    layers.Dense(512, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.4),
    layers.Dense(256, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(num_classes, activation='softmax')
])

# Compile model
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',
    metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
)

model.summary()
print(f"✓ Model compiled with {model.count_params():,} parameters")

# Step 4: Train Model
print("\n[4/6] Training model...")

# Callbacks
callbacks = [
    EarlyStopping(
        monitor='val_accuracy',
        patience=5,
        restore_best_weights=True,
        verbose=1
    ),
    ModelCheckpoint(
        filepath=str(SCRIPT_DIR / 'best_model.h5'),
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=3,
        min_lr=1e-7,
        verbose=1
    )
]

# Train
history = model.fit(
    train_generator,
    validation_data=validation_generator,
    epochs=EPOCHS,
    callbacks=callbacks,
    verbose=1
)

# Evaluate final performance
print("\n[5/6] Evaluating model performance...")
val_loss, val_accuracy, val_top3_accuracy = model.evaluate(validation_generator, verbose=0)
print(f"✓ Validation Accuracy: {val_accuracy*100:.2f}%")
print(f"✓ Top-3 Accuracy: {val_top3_accuracy*100:.2f}%")

if val_accuracy < TARGET_ACCURACY:
    print(f"⚠ Warning: Accuracy {val_accuracy*100:.2f}% below target {TARGET_ACCURACY*100:.2f}%")
else:
    print(f"✓ Target accuracy achieved!")

# Step 5: Convert to TensorFlow Lite
print("\n[6/6] Converting model to TensorFlow Lite...")

# Convert to TFLite with optimizations
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]  # Use float16 for smaller size
tflite_model = converter.convert()

# Save TFLite model
with open(MODEL_SAVE_PATH, 'wb') as f:
    f.write(tflite_model)

model_size_mb = len(tflite_model) / (1024 * 1024)
print(f"✓ TFLite model saved to {MODEL_SAVE_PATH}")
print(f"✓ Model size: {model_size_mb:.2f} MB")

if model_size_mb > 20:
    print(f"⚠ Warning: Model size {model_size_mb:.2f}MB exceeds 20MB target")

# Step 6: Generate Treatment Recommendations
print("\n[BONUS] Generating treatment recommendations...")

# Treatment database (expandable based on actual dataset classes)
treatments_template = {
    "healthy": {
        "severity": "none",
        "treatment": "No treatment needed. Continue regular care and monitoring.",
        "steps": [
            "Maintain proper watering schedule",
            "Ensure adequate sunlight exposure",
            "Monitor for any changes in leaf color or texture"
        ],
        "prevention": "Keep up good agricultural practices"
    },
    "default_fungal": {
        "severity": "medium",
        "treatment": "Fungal infection detected. Apply fungicide treatment.",
        "steps": [
            "Remove and destroy affected leaves",
            "Apply copper-based fungicide spray",
            "Reduce leaf wetness by improving air circulation",
            "Avoid overhead watering",
            "Repeat treatment every 7-10 days"
        ],
        "prevention": "Ensure proper spacing between plants for air circulation"
    },
    "default_bacterial": {
        "severity": "high",
        "treatment": "Bacterial infection detected. Immediate action required.",
        "steps": [
            "Isolate affected plants immediately",
            "Remove and burn infected plant parts",
            "Apply copper-based bactericide",
            "Disinfect all tools with 10% bleach solution",
            "Avoid working with plants when wet"
        ],
        "prevention": "Practice crop rotation and use disease-free seeds"
    },
    "default_viral": {
        "severity": "high",
        "treatment": "Viral infection detected. No cure available - focus on prevention.",
        "steps": [
            "Remove and destroy infected plants",
            "Control insect vectors (aphids, whiteflies)",
            "Use reflective mulches to deter insects",
            "Plant virus-resistant varieties in future",
            "Maintain strict sanitation practices"
        ],
        "prevention": "Control insect populations and use certified virus-free seeds"
    },
    "nutrient_deficiency": {
        "severity": "low",
        "treatment": "Nutrient deficiency detected. Adjust fertilization.",
        "steps": [
            "Test soil pH and nutrient levels",
            "Apply balanced NPK fertilizer",
            "Consider foliar spray for quick correction",
            "Improve soil organic matter",
            "Monitor plant response over 2 weeks"
        ],
        "prevention": "Regular soil testing and balanced fertilization"
    }
}

# Generate treatments for all detected classes
treatments = {}
for class_id, class_name in class_labels.items():
    class_name_lower = class_name.lower()

    if 'healthy' in class_name_lower:
        treatments[class_name] = treatments_template['healthy']
    elif any(x in class_name_lower for x in ['blight', 'spot', 'rust', 'mold', 'mildew', 'scab']):
        treatments[class_name] = treatments_template['default_fungal']
    elif 'bacterial' in class_name_lower:
        treatments[class_name] = treatments_template['default_bacterial']
    elif any(x in class_name_lower for x in ['virus', 'mosaic', 'curl']):
        treatments[class_name] = treatments_template['default_viral']
    elif 'yellow' in class_name_lower or 'deficiency' in class_name_lower:
        treatments[class_name] = treatments_template['nutrient_deficiency']
    else:
        # Default to fungal treatment
        treatments[class_name] = treatments_template['default_fungal']

# Save treatments
with open(TREATMENTS_PATH, 'w') as f:
    json.dump(treatments, f, indent=2)
print(f"✓ Saved treatments to {TREATMENTS_PATH}")

# Final Summary
print("\n" + "=" * 80)
print("TRAINING COMPLETE!")
print("=" * 80)
print(f"Model Accuracy: {val_accuracy*100:.2f}%")
print(f"Top-3 Accuracy: {val_top3_accuracy*100:.2f}%")
print(f"Model Size: {model_size_mb:.2f} MB")
print(f"Classes: {num_classes}")
print(f"\nOutput Files:")
print(f"  • {MODEL_SAVE_PATH}")
print(f"  • {LABELS_PATH}")
print(f"  • {TREATMENTS_PATH}")
print("=" * 80)
print("\nNext Steps:")
print("1. Copy model files to your React Native app's assets/models directory")
print("2. Test inference on sample images")
print("3. Deploy to mobile app")
print("=" * 80)
