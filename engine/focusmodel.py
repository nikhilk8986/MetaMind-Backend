import kagglehub
import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import classification_report, accuracy_score

MODEL_FILE = "user_behavior_model.pkl"
SCALER_FILE = "scaler.pkl"
ENCODER_FILE = "encoder.pkl"

# ---------------------------------------------------------
# 1. If model already exists, just load it
# ---------------------------------------------------------
if os.path.exists(MODEL_FILE) and os.path.exists(SCALER_FILE) and os.path.exists(ENCODER_FILE):
    print("Loading saved model...")
    knn = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    label_encoder = joblib.load(ENCODER_FILE)

else:
    print("Training new model...")

    # ---------------------------------------------------------
    # 2. Download dataset
    # ---------------------------------------------------------
    path = kagglehub.dataset_download(
        "valakhorasani/mobile-device-usage-and-user-behavior-dataset"
    )
    print("Path to dataset files:", path)

    # ---------------------------------------------------------
    # 3. Locate CSV file
    # ---------------------------------------------------------
    csv_file = None
    for file in os.listdir(path):
        if file.endswith(".csv"):
            csv_file = os.path.join(path, file)
            break
    if csv_file is None:
        raise FileNotFoundError("No CSV file found in dataset folder!")

    # ---------------------------------------------------------
    # 4. Load dataset
    # ---------------------------------------------------------
    df = pd.read_csv(csv_file)
    print("Dataset loaded successfully. Shape:", df.shape)

    # ---------------------------------------------------------
    # 5. Select required columns
    # ---------------------------------------------------------
    df = df[["Age", "Gender", "Screen On Time (hours/day)", "User Behavior Class"]]

    # Encode Gender (Male/Female → 0/1)
    label_encoder = LabelEncoder()
    df["Gender"] = label_encoder.fit_transform(df["Gender"])

    # Features and target
    X = df[["Age", "Gender", "Screen On Time (hours/day)"]]
    y = df["User Behavior Class"]

    # ---------------------------------------------------------
    # 6. Train/test split
    # ---------------------------------------------------------
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ---------------------------------------------------------
    # 7. Scale features (important for KNN)
    # ---------------------------------------------------------
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ---------------------------------------------------------
    # 8. Train KNN model
    # ---------------------------------------------------------
    knn = KNeighborsClassifier(n_neighbors=5)
    knn.fit(X_train_scaled, y_train)

    # ---------------------------------------------------------
    # 9. Evaluate model
    # ---------------------------------------------------------
    y_pred = knn.predict(X_test_scaled)
    print("\nModel Evaluation:")
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    # ---------------------------------------------------------
    # 10. Save model, scaler, and encoder
    # ---------------------------------------------------------
    joblib.dump(knn, MODEL_FILE)
    joblib.dump(scaler, SCALER_FILE)
    joblib.dump(label_encoder, ENCODER_FILE)
    print("Model saved for future use!")

# ---------------------------------------------------------
# 11. Example prediction
# ---------------------------------------------------------
# Example: Age=25, Female=1, Screen Time=3.5 hours/day
new_user = np.array([[25, 1, 3.5]])
new_user_scaled = scaler.transform(new_user)
predicted_class = knn.predict(new_user_scaled)

print("\nPredicted User Behavior Class for new user:", predicted_class[0])