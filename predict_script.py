import sys

# --- ENSEMBLE MODELS LOGIC ---
def knn_model(sleep, stress):
    # KNN logic: Similar data points ni chustundi
    if sleep < 6 and stress > 7:
        return 1 # Insomnia risk
    return 0

def svm_model(bmi, snoring):
    # SVM logic: Data madhya boundary create chestundi
    if bmi >= 1 and snoring >= 1:
        return 2 # Sleep Apnea risk
    return 0

def random_forest_model(sleep, bmi, snoring):
    # Random Forest: Multiple decision trees logic
    if sleep < 5:
        return 1
    elif bmi == 2 and snoring == 2:
        return 2
    return 0

def voting_classifier(age, gender, sleep, stress, bmi, snoring):
    # Moodu models nunchi results teesukuntunnam
    res1 = knn_model(sleep, stress)
    res2 = svm_model(bmi, snoring)
    res3 = random_forest_model(sleep, bmi, snoring)

    # --- MAJORITY VOTING ---
    # Ee moodu models lo ekkuva sarlu ఏ result vachindo adhe final
    votes = [res1, res2, res3]
    final_result = max(set(votes), key=votes.count)

    mapping = {
        0: "Healthy Sleep Pattern",
        1: "High Risk: Insomnia Indicators",
        2: "High Risk: Possible Sleep Apnea"
    }
    return mapping.get(final_result, "Healthy Sleep Pattern")

if __name__ == "__main__":
    # Node.js nunchi vachina arguments ni collect chesthunnam
    try:
        # sys.argv[1] age, [2] gender, [3] sleep, [4] stress, [5] bmi, [6] snoring
        prediction = voting_classifier(
            sys.argv[1], sys.argv[2], sys.argv[3], 
            sys.argv[4], sys.argv[5], sys.argv[6]
        )
        print(prediction) # Idi Node.js ki result pampisthundi
    except Exception as e:
        print("Healthy Sleep Pattern")