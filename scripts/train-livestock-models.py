#!/usr/bin/env python3
"""
Train ML Models for Livestock Management
1. Pasture Biomass Prediction (from NDVI, weather, soil moisture)
2. Feed Requirements Optimization (from weather, animal counts)
"""

import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import joblib
import os

print("🐄 Training Livestock Management ML Models\n")

# Load data
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
data_path = os.path.join(project_root, 'livestock_training_data', 'livestock_complete.json')
print(f"📂 Loading data from {data_path}...")

with open(data_path, 'r') as f:
    data = json.load(f)

df = pd.DataFrame(data)
print(f"✅ Loaded {len(df)} records\n")

# Display data summary
print("📊 Data Summary:")
print(df[['location', 'ndvi', 'biomass', 'soilMoisture', 'temp', 'rainfall']].describe())
print()

# ============================================================================
# MODEL 1: Pasture Biomass Prediction
# ============================================================================
print("=" * 80)
print("MODEL 1: PASTURE BIOMASS PREDICTION")
print("=" * 80)

# Features for biomass prediction
biomass_features = [
    'ndvi', 'evi', 'soilMoisture', 'temp', 'tempMax', 'tempMin',
    'rainfall', 'humidity', 'windSpeed', 'avgTemp', 'totalRainfall', 'avgHumidity'
]

X_biomass = df[biomass_features].values
y_biomass = df['biomass'].values

print(f"Features shape: {X_biomass.shape}")
print(f"Target shape: {y_biomass.shape}")

# Train/test split
X_train_bio, X_test_bio, y_train_bio, y_test_bio = train_test_split(
    X_biomass, y_biomass, test_size=0.2, random_state=42
)

# Scale features
scaler_biomass = StandardScaler()
X_train_bio_scaled = scaler_biomass.fit_transform(X_train_bio)
X_test_bio_scaled = scaler_biomass.transform(X_test_bio)

# Method 1: Random Forest
print("\n🌲 Training Random Forest...")
rf_biomass = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)
rf_biomass.fit(X_train_bio_scaled, y_train_bio)

y_pred_rf = rf_biomass.predict(X_test_bio_scaled)
mae_rf = mean_absolute_error(y_test_bio, y_pred_rf)
r2_rf = r2_score(y_test_bio, y_pred_rf)
rmse_rf = np.sqrt(mean_squared_error(y_test_bio, y_pred_rf))

print(f"Random Forest Results:")
print(f"  MAE: {mae_rf:.2f} kg/ha")
print(f"  RMSE: {rmse_rf:.2f} kg/ha")
print(f"  R²: {r2_rf:.4f}")

# Method 2: Neural Network
print("\n🧠 Training Neural Network...")
model_biomass_nn = keras.Sequential([
    layers.Dense(128, activation='relu', input_shape=(X_train_bio_scaled.shape[1],)),
    layers.Dropout(0.2),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dense(1)
])

model_biomass_nn.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

early_stop = keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=20,
    restore_best_weights=True
)

history_bio = model_biomass_nn.fit(
    X_train_bio_scaled, y_train_bio,
    validation_split=0.2,
    epochs=200,
    batch_size=32,
    callbacks=[early_stop],
    verbose=0
)

y_pred_nn = model_biomass_nn.predict(X_test_bio_scaled, verbose=0).flatten()
mae_nn = mean_absolute_error(y_test_bio, y_pred_nn)
r2_nn = r2_score(y_test_bio, y_pred_nn)
rmse_nn = np.sqrt(mean_squared_error(y_test_bio, y_pred_nn))

print(f"Neural Network Results:")
print(f"  MAE: {mae_nn:.2f} kg/ha")
print(f"  RMSE: {rmse_nn:.2f} kg/ha")
print(f"  R²: {r2_nn:.4f}")

# Feature importance
feature_importance = pd.DataFrame({
    'feature': biomass_features,
    'importance': rf_biomass.feature_importances_
}).sort_values('importance', ascending=False)

print("\n📊 Feature Importance (Top 5):")
print(feature_importance.head())

# ============================================================================
# MODEL 2: Feed Requirements Optimization
# ============================================================================
print("\n" + "=" * 80)
print("MODEL 2: FEED REQUIREMENTS OPTIMIZATION")
print("=" * 80)

# Features for feed prediction
feed_features = [
    'temp', 'tempMax', 'tempMin', 'rainfall', 'humidity', 'windSpeed',
    'cattleCount', 'sheepCount', 'totalAnimals', 'pastureAreaHa'
]

X_feed = df[feed_features].values
y_feed = df['adjustedFeedKg'].values

print(f"Features shape: {X_feed.shape}")
print(f"Target shape: {y_feed.shape}")

# Train/test split
X_train_feed, X_test_feed, y_train_feed, y_test_feed = train_test_split(
    X_feed, y_feed, test_size=0.2, random_state=42
)

# Scale features
scaler_feed = StandardScaler()
X_train_feed_scaled = scaler_feed.fit_transform(X_train_feed)
X_test_feed_scaled = scaler_feed.transform(X_test_feed)

# Method 1: Gradient Boosting
print("\n🚀 Training Gradient Boosting...")
gb_feed = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=10,
    random_state=42
)
gb_feed.fit(X_train_feed_scaled, y_train_feed)

y_pred_gb = gb_feed.predict(X_test_feed_scaled)
mae_gb = mean_absolute_error(y_test_feed, y_pred_gb)
r2_gb = r2_score(y_test_feed, y_pred_gb)
rmse_gb = np.sqrt(mean_squared_error(y_test_feed, y_pred_gb))

print(f"Gradient Boosting Results:")
print(f"  MAE: {mae_gb:.2f} kg/day")
print(f"  RMSE: {rmse_gb:.2f} kg/day")
print(f"  R²: {r2_gb:.4f}")

# Method 2: Neural Network
print("\n🧠 Training Neural Network for Feed...")
model_feed_nn = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(X_train_feed_scaled.shape[1],)),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dropout(0.1),
    layers.Dense(16, activation='relu'),
    layers.Dense(1)
])

model_feed_nn.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

history_feed = model_feed_nn.fit(
    X_train_feed_scaled, y_train_feed,
    validation_split=0.2,
    epochs=200,
    batch_size=16,
    callbacks=[early_stop],
    verbose=0
)

y_pred_feed_nn = model_feed_nn.predict(X_test_feed_scaled, verbose=0).flatten()
mae_feed_nn = mean_absolute_error(y_test_feed, y_pred_feed_nn)
r2_feed_nn = r2_score(y_test_feed, y_pred_feed_nn)
rmse_feed_nn = np.sqrt(mean_squared_error(y_test_feed, y_pred_feed_nn))

print(f"Neural Network Results:")
print(f"  MAE: {mae_feed_nn:.2f} kg/day")
print(f"  RMSE: {rmse_feed_nn:.2f} kg/day")
print(f"  R²: {r2_feed_nn:.4f}")

# ============================================================================
# MODEL 3: Grazing Days Prediction
# ============================================================================
print("\n" + "=" * 80)
print("MODEL 3: GRAZING DAYS PREDICTION")
print("=" * 80)

grazing_features = [
    'ndvi', 'biomass', 'soilMoisture', 'temp', 'rainfall',
    'cattleCount', 'sheepCount', 'pastureAreaHa', 'stockingRate'
]

X_grazing = df[grazing_features].values
y_grazing = df['grazingDays'].values

X_train_grz, X_test_grz, y_train_grz, y_test_grz = train_test_split(
    X_grazing, y_grazing, test_size=0.2, random_state=42
)

scaler_grazing = StandardScaler()
X_train_grz_scaled = scaler_grazing.fit_transform(X_train_grz)
X_test_grz_scaled = scaler_grazing.transform(X_test_grz)

print("\n🌾 Training Random Forest for Grazing Days...")
rf_grazing = RandomForestRegressor(
    n_estimators=150,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)
rf_grazing.fit(X_train_grz_scaled, y_train_grz)

y_pred_grz = rf_grazing.predict(X_test_grz_scaled)
mae_grz = mean_absolute_error(y_test_grz, y_pred_grz)
r2_grz = r2_score(y_test_grz, y_pred_grz)

print(f"Grazing Days Prediction Results:")
print(f"  MAE: {mae_grz:.2f} days")
print(f"  R²: {r2_grz:.4f}")

# ============================================================================
# SAVE MODELS
# ============================================================================
print("\n" + "=" * 80)
print("SAVING MODELS")
print("=" * 80)

models_dir = os.path.join(project_root, 'assets', 'models')
os.makedirs(models_dir, exist_ok=True)

# Save biomass models
print("\n💾 Saving biomass prediction models...")
joblib.dump(rf_biomass, os.path.join(models_dir, 'livestock_biomass_rf.pkl'))
model_biomass_nn.save(os.path.join(models_dir, 'livestock_biomass_nn.h5'))
joblib.dump(scaler_biomass, os.path.join(models_dir, 'livestock_biomass_scaler.pkl'))

# Convert biomass NN to TFLite for mobile
converter = tf.lite.TFLiteConverter.from_keras_model(model_biomass_nn)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_biomass = converter.convert()
with open(os.path.join(models_dir, 'livestock_biomass.tflite'), 'wb') as f:
    f.write(tflite_biomass)
print("✅ Biomass models saved (RF, NN, TFLite, Scaler)")

# Save feed models
print("\n💾 Saving feed optimization models...")
joblib.dump(gb_feed, os.path.join(models_dir, 'livestock_feed_gb.pkl'))
model_feed_nn.save(os.path.join(models_dir, 'livestock_feed_nn.h5'))
joblib.dump(scaler_feed, os.path.join(models_dir, 'livestock_feed_scaler.pkl'))

# Convert feed NN to TFLite
converter_feed = tf.lite.TFLiteConverter.from_keras_model(model_feed_nn)
converter_feed.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_feed = converter_feed.convert()
with open(os.path.join(models_dir, 'livestock_feed.tflite'), 'wb') as f:
    f.write(tflite_feed)
print("✅ Feed models saved (GB, NN, TFLite, Scaler)")

# Save grazing model
print("\n💾 Saving grazing days model...")
joblib.dump(rf_grazing, os.path.join(models_dir, 'livestock_grazing_rf.pkl'))
joblib.dump(scaler_grazing, os.path.join(models_dir, 'livestock_grazing_scaler.pkl'))
print("✅ Grazing models saved (RF, Scaler)")

# Save feature lists
feature_config = {
    'biomass_features': biomass_features,
    'feed_features': feed_features,
    'grazing_features': grazing_features
}
with open(os.path.join(models_dir, 'livestock_features.json'), 'w') as f:
    json.dump(feature_config, f, indent=2)
print("✅ Feature configuration saved")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TRAINING COMPLETE - SUMMARY")
print("=" * 80)

print("\n📊 Model Performance:")
print(f"\n1. Biomass Prediction:")
print(f"   Random Forest: MAE={mae_rf:.2f} kg/ha, R²={r2_rf:.4f}")
print(f"   Neural Network: MAE={mae_nn:.2f} kg/ha, R²={r2_nn:.4f}")

print(f"\n2. Feed Optimization:")
print(f"   Gradient Boosting: MAE={mae_gb:.2f} kg/day, R²={r2_gb:.4f}")
print(f"   Neural Network: MAE={mae_feed_nn:.2f} kg/day, R²={r2_feed_nn:.4f}")

print(f"\n3. Grazing Days:")
print(f"   Random Forest: MAE={mae_grz:.2f} days, R²={r2_grz:.4f}")

print(f"\n📁 Models saved to: {models_dir}")
print(f"   - livestock_biomass_rf.pkl (Random Forest)")
print(f"   - livestock_biomass.tflite (Mobile)")
print(f"   - livestock_feed_gb.pkl (Gradient Boosting)")
print(f"   - livestock_feed.tflite (Mobile)")
print(f"   - livestock_grazing_rf.pkl (Random Forest)")
print(f"   - All scalers and feature configs")

print("\n✅ All models trained and ready for deployment!")
