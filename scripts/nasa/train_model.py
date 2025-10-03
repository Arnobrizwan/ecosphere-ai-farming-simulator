#!/usr/bin/env python3
"""
Train ML model for soil moisture prediction
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib

# Directories
INPUT_FILE = "data/processed/merged_features.csv"
MODEL_DIR = "models"
MODEL_FILE = f"{MODEL_DIR}/rf_soil_moisture.pkl"

def load_data():
    """Load preprocessed data"""
    print("📂 Loading preprocessed data...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ File not found: {INPUT_FILE}")
        print("   Run: npm run nasa:preprocess")
        return None
    
    df = pd.read_csv(INPUT_FILE)
    print(f"✅ Loaded {len(df)} rows")
    print(f"   Columns: {list(df.columns)}")
    
    return df

def prepare_features(df):
    """Prepare features for training"""
    print("\n🔧 Preparing features...")
    
    # Features to use
    feature_cols = [
        'precipitation',
        'day_of_year',
        'month',
        'precip_7d_sum'
    ]
    
    # Add NDVI if available
    if 'ndvi' in df.columns:
        feature_cols.append('ndvi')
    
    # Target: predict next day's soil moisture
    df['target'] = df['soil_moisture'].shift(-1)
    
    # Drop last row (no target)
    df = df[:-1].copy()
    
    # Select features
    X = df[feature_cols].copy()
    y = df['target'].copy()
    
    # Handle missing values
    X = X.fillna(X.mean())
    
    print(f"✅ Features: {feature_cols}")
    print(f"   Training samples: {len(X)}")
    
    return X, y, feature_cols

def train_model(X, y):
    """Train Random Forest model"""
    print("\n🌲 Training Random Forest model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    print("   Training...")
    model.fit(X_train, y_train)
    
    # Evaluate
    print("\n📊 Evaluating model...")
    
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mse = mean_squared_error(y_train, train_pred)
    test_mse = mean_squared_error(y_test, test_pred)
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    
    print(f"\n   Training MSE: {train_mse:.6f}")
    print(f"   Training R²:  {train_r2:.4f}")
    print(f"   Test MSE:     {test_mse:.6f}")
    print(f"   Test R²:      {test_r2:.4f}")
    print(f"   Test MAE:     {test_mae:.6f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n🎯 Feature Importance:")
    for _, row in feature_importance.iterrows():
        print(f"   {row['feature']:20s}: {row['importance']:.4f}")
    
    return model, {
        'train_mse': float(train_mse),
        'test_mse': float(test_mse),
        'train_r2': float(train_r2),
        'test_r2': float(test_r2),
        'test_mae': float(test_mae),
        'feature_importance': feature_importance.to_dict('records')
    }

def save_model(model, metrics, feature_cols):
    """Save trained model"""
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    print(f"\n💾 Saving model to: {MODEL_FILE}")
    joblib.dump(model, MODEL_FILE)
    
    # Save model metadata
    metadata = {
        'model_type': 'RandomForestRegressor',
        'n_estimators': 100,
        'features': feature_cols,
        'target': 'soil_moisture (next day)',
        'metrics': metrics,
        'trained_date': pd.Timestamp.now().isoformat(),
        'training_samples': len(model.estimators_[0].tree_.value)
    }
    
    metadata_file = f"{MODEL_DIR}/model_metadata.json"
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"📋 Metadata saved to: {metadata_file}")
    
    # Get model size
    model_size = os.path.getsize(MODEL_FILE) / 1024  # KB
    print(f"📦 Model size: {model_size:.2f} KB")

def main():
    print("=" * 60)
    print("ML Model Training Pipeline")
    print("=" * 60)
    print()
    
    # Load data
    df = load_data()
    if df is None:
        return
    
    # Prepare features
    X, y, feature_cols = prepare_features(df)
    
    # Train model
    model, metrics = train_model(X, y)
    
    # Save model
    save_model(model, metrics, feature_cols)
    
    print("\n✅ Training complete!")
    print(f"\n📝 To use the model:")
    print(f"   import joblib")
    print(f"   model = joblib.load('{MODEL_FILE}')")
    print(f"   prediction = model.predict(features)")

if __name__ == '__main__':
    main()
