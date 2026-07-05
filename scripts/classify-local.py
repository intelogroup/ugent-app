#!/usr/bin/env python3
import json, re, os, sys
from collections import defaultdict

QUESTIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "medicospira-questions.jsonl")
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "classified-questions.jsonl")

SYSTEM_KEYWORDS = {
    "Cardiovascular": ["cardiovascular", "cardiac", "heart", "myocardial", "coronary", "arrhythmia", "aortic", "valvular", "endocarditis", "pericard", "cardiomyopathy", "congestive heart", "hypertension", "atherosclerosis", "angina", "statin", "beta blocker", "ace inhibitor"],
    "Respiratory": ["respiratory", "pulmonary", "lung", "airway", "bronch", "pneumonia", "asthma", "copd", "emphysema", "pleural", "pneumothorax", "tuberculosis", "ventilation", "oxygen", "spirometry", "peak flow", "inhaler"],
    "Gastrointestinal": ["gastrointestinal", "GI", "stomach", "intestine", "colon", "esophageal", "liver", "hepatic", "pancreatitis", "hepatitis", "cirrhosis", "gallbladder", "biliary", "celiac", "crohn", "ulcerative colitis", "peptic", "dysphagia", "emesis", "diarrhea", "constipation", "melena", "hematochezia"],
    "Renal": ["renal", "kidney", "nephron", "glomerular", "creatinine", "bun", "dialysis", "nephrotic", "nephritic", "pyelonephritis", "ureter", "bladder", "urinary", "hematuria", "proteinuria", "acidosis", "electrolyte", "potassium", "sodium", "aldosterone", "renin"],
    "Neurology": ["neurolog", "brain", "cerebral", "cerebell", "stroke", "seizure", "epilepsy", "meningitis", "encephalitis", "neuropathy", "myasthenia", "multiple sclerosis", "parkinson", "alzheimer", "dementia", "spinal cord", "peripheral nerve", "cranial nerve", "headache", "migraine", "gait", "ataxia", "tremor", "aphasia", "paresis", "plegia", "reflex", "sensory", "motor", "cortex", "thalamus", "hypothalamus", "hippocampus"],
    "Endocrine": ["endocrine", "thyroid", "parathyroid", "adrenal", "pituitary", "hypothalamus", "diabetes", "insulin", "glucagon", "cortisol", "aldosterone", "estrogen", "testosterone", "thyroxine", "tsh", "t3", "t4", "hyperthyroid", "hypothyroid", "cushing", "addison", "acromegaly", "prolactin", "growth hormone", "metabolic", "obesity", "lipid", "cholesterol", "osteoporosis", "calcium", "phosphate", "vitamin d", "parathyroid", "goiter"],
    "Reproductive": ["reproductive", "pregnancy", "uterus", "ovarian", "fallopian", "endometrial", "cervical", "vaginal", "placenta", "fetal", "gestation", "contraception", "menstrual", "menopause", "fertility", "infertility", "preeclampsia", "eclampsia", "abortion", "miscarriage", "breast", "mammary", "prostate", "testicular", "penile", "semen", "sperm", "ovulation", "gonad"],
    "Musculoskeletal": ["musculoskeletal", "bone", "joint", "muscle", "skeletal", "fracture", "osteopor", "arthritis", "rheumatoid", "osteoarthritis", "gout", "ligament", "tendon", "cartilage", "spine", "vertebral", "disk", "sciatica", "myopathy", "dystrophy", "sarcoma", "osteosarcoma"],
    "Hematology & Oncology": ["hematolog", "oncology", "cancer", "tumor", "malignancy", "neoplasm", "carcinoma", "sarcoma", "lymphoma", "leukemia", "anemia", "hemoglobin", "erythrocyte", "leukocyte", "platelet", "coagulation", "hemophilia", "thrombosis", "embolism", "hemochromatosis", "sickle cell", "thalassemia", "chemotherapy", "radiation", "metastasis"],
    "Immunology": ["immunolog", "immune", "antibody", "antigen", "autoimmune", "allergy", "anaphylaxis", "immunodeficiency", "hiv", "aids", "vaccine", "immunization", "lymphocyte", "t cell", "b cell", "cytokine", "interleukin", "interferon", "immunoglobulin", "complement", "histamine", "mast cell", "eosinophil", "neutrophil", "macrophage"],
    "Infectious Disease": ["infection", "bacterial", "viral", "fungal", "parasitic", "sepsis", "abscess", "cellulitis", "osteomyelitis", "septic", "antibiotic", "antiviral", "antifungal", "gram positive", "gram negative", "staphylococcus", "streptococcus", "e coli", "pseudomonas", "clostridium", "salmonella", "shigella", "campylobacter", "helicobacter", "mycobacterium", "candida", "aspergillus", "malaria", "toxoplasma", "herpes", "influenza"],
    "Psychiatry": ["psychiatr", "depression", "anxiety", "schizophrenia", "bipolar", "mania", "psychosis", "suicide", "ocd", "ptsd", "panic", "phobia", "adhd", "autism", "dementia", "delirium", "addiction", "substance abuse", "alcoholism", "eating disorder", "anorexia", "bulimia", "insomnia", "antidepressant", "antipsychotic", "lithium", "ssri", "maoi", "electroconvulsive"],
    "Integumentary": ["skin", "dermatolog", "rash", "lesion", "melanoma", "squamous", "basal cell", "psoriasis", "eczema", "dermatitis", "acne", "burn", "wound", "ulcer", "blister", "erythema", "pruritus", "alopecia", "hair", "nail", "sweat gland", "sebaceous"],
    "Pediatrics": ["pediatric", "newborn", "neonatal", "infant", "child", "adolescent", "congenital", "birth defect", "developmental", "growth", "vaccination", "immunization schedule", "apgar", "meconium", "jaundice", "kernicterus", "croup", "bronchiolitis", "rsv", "fever", "sepsis", "meningitis", "utis"],
    "Pharmacology": ["pharmacolog", "drug", "medication", "dosage", "side effect", "adverse", "contraindication", "interaction", "metabolism", "pharmacokinetic", "pharmacodynamic", "half-life", "clearance", "bioavailability", "receptor", "agonist", "antagonist", "inhibitor", "inducer", "therapeutic index", "toxic"],
}

SUBJECT_KEYWORDS = {
    "Anatomy": ["anatomy", "anatomic", "structure", "nerve supply", "blood supply", "innervation", "foramen", "fossa", "canal", "muscle origin", "insertion"],
    "Physiology": ["physiology", "physiologic", "homeostasis", "feedback loop", "action potential", "neurotransmission", "contraction", "relaxation", "gas exchange", "filtration", "reabsorption", "secretion", "absorption", "digestion"],
    "Pathology": ["pathology", "pathologic", "histology", "biopsy", "specimen", "microscopic", "gross", "staging", "grading", "necrosis", "infarct", "inflammation", "granuloma", "metaplasia", "dysplasia", "atrophy", "hypertrophy", "hyperplasia"],
    "Pharmacology": ["pharmacology", "mechanism of action", "side effect profile", "drug class", "antibiotic", "antihypertensive", "anticoagulant", "diuretic", "statin", "opioid", "nsaid", "corticosteroid", "chemotherapeutic"],
    "Microbiology": ["microbiology", "bacterium", "virus", "fungus", "parasite", "gram stain", "culture", "serology", "pcr", "antimicrobial", "resistance", "nosocomial", "zoonotic", "vector", "incubation period"],
    "Biostatistics & Epidemiology": ["biostatistics", "epidemiology", "statistics", "p value", "confidence interval", "relative risk", "odds ratio", "sensitivity", "specificity", "ppv", "npv", "likelihood ratio", "study design", "randomized", "cohort", "case-control", "cross-sectional", "meta-analysis", "systematic review", "incidence", "prevalence", "mortality", "morbidity"],
    "Behavioral Science": ["behavioral", "psychosocial", "ethics", "informed consent", "confidentiality", "autonomy", "beneficence", "nonmaleficence", "justice", "advance directive", "living will", "healthcare proxy", "doctor-patient relationship", "interview technique", "counseling", "motivational interviewing"],
    "Immunology": ["immunology", "innate immunity", "adaptive immunity", "humoral", "cell-mediated", "mhc", "hla", "immunoglobulin", "monoclonal antibody", "vaccine", "immunization", "hypersensitivity", "type i", "type ii", "type iii", "type iv", "autoantibody"],
    "Neurology": ["neurology", "neurologic exam", "cranial nerve", "reflex", "sensory exam", "motor exam", "lumbar puncture", "csf analysis", "eeg", "emg", "nerve conduction", "mri brain", "ct head"],
    "Psychiatry": ["psychiatry", "mental status exam", "mse", "dsm", "diagnostic criteria", "therapy", "psychotherapy", "cbt", "electroconvulsive", "commitment", "involuntary"],
    "Pediatrics": ["pediatrics", "growth chart", "developmental milestone", "childhood vaccination", "newborn screen", "apgar score", "denver developmental", "failure to thrive", "breastfeeding", "nutrition"],
    "Obstetrics": ["obstetrics", "prenatal", "antenatal", "intrapartum", "postpartum", "contraction", "cervical dilation", "fetal monitoring", "ultrasound", "amniocentesis", "c-section", "labor", "delivery", "apgar"],
    "Dermatology": ["dermatology", "skin lesion", "rash morphology", "macule", "papule", "nodule", "plaque", "vesicle", "bulla", "pustule", "scale", "crust", "erosion", "ulcer", "excoriation", "lichenification", "dermatome"],
    "Pulmonology": ["pulmonology", "pft", "pulmonary function", "spirometry", "diffusion capacity", "bronchoscopy", "sputum culture", "thoracentesis", "pleural fluid", "ABG", "blood gas", "hypoxia", "hypercapnia"],
    "Infectious Disease": ["infectious disease", "fever of unknown origin", "nosocomial infection", "opportunistic infection", "tropical disease", "travel medicine", "antimicrobial stewardship"],
    "Endocrinology": ["endocrinology", "hormone", "feedback", "stimulation test", "suppression test", "dexamethasone suppression", "acth stimulation", "oral glucose tolerance", "hba1c", "thyroid function", "tft", "bone density", "dxa", "endocrine"],
    "Genetics": ["genetic", "mutation", "inheritance", "autosomal", "chromosome", "allele", "pedigree", "karyotype", "mendelian", "trinucleotide", "oncogene", "tumor suppressor", "genotype", "phenotype", "heterozygous", "homozygous", "nondisjunction", "translocation", "imprinting", "mitochondrial inheritance", "mosaicism", "pleiotropy", "penetrance", "expressivity", "anticipation", "consanguinity", "heteroplasmy", "loss of heterozygosity"],
}

DIFFICULTY_KEYWORDS = {
    "EASY": ["simple", "straightforward", "classic", "typical presentation", "common", "first-line", "most common"],
    "HARD": ["complex", "rare", "atypical", "unusual", "advanced", "complicated", "severe", "refractory", "resistant", "syndrome", "variant"],
}

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()

def score_system(question: dict) -> tuple[str, int]:
    q_text = normalize(question.get("text", ""))
    explanation = normalize(question.get("explanation", ""))
    edu_obj = normalize(question.get("educationalObjective", ""))
    
    sources = [
        (edu_obj, 4),
        (explanation, 2),
        (q_text, 1),
    ]
    
    scores = defaultdict(int)
    for system, keywords in SYSTEM_KEYWORDS.items():
        for source_text, weight in sources:
            for kw in keywords:
                if kw in source_text:
                    scores[system] += weight
    
    best = max(scores, key=scores.get) if scores else "General"
    confidence = scores[best] if scores else 0
    return best, confidence

def score_subject(question: dict) -> tuple[str, int]:
    q_text = normalize(question.get("text", ""))
    explanation = normalize(question.get("explanation", ""))
    edu_obj = normalize(question.get("educationalObjective", ""))
    
    sources = [
        (edu_obj, 4),
        (explanation, 2),
        (q_text, 1),
    ]
    
    scores = defaultdict(int)
    for subject, keywords in SUBJECT_KEYWORDS.items():
        for source_text, weight in sources:
            for kw in keywords:
                if kw in source_text:
                    scores[subject] += weight
    
    best = max(scores, key=scores.get) if scores else "General"
    confidence = scores[best] if scores else 0
    return best, confidence

def classify(question: dict) -> dict:
    system, sys_conf = score_system(question)
    subject, sub_conf = score_subject(question)
    
    result = {**question}
    result["system"] = system
    result["subject"] = subject
    result["systemConfidence"] = sys_conf
    result["subjectConfidence"] = sub_conf
    result["difficulty"] = "MEDIUM"
    return result

def main():
    filter_system = None
    filter_subject = None
    for i, arg in enumerate(sys.argv):
        if arg == "--system" and i + 1 < len(sys.argv):
            filter_system = sys.argv[i + 1].lower()
        if arg == "--subject" and i + 1 < len(sys.argv):
            filter_subject = sys.argv[i + 1].lower()
        if arg == "--questions" and i + 1 < len(sys.argv):
            global QUESTIONS_FILE
            QUESTIONS_FILE = sys.argv[i + 1]
    
    if not os.path.exists(QUESTIONS_FILE):
        print(f"[CLASSIFY] No questions file: {QUESTIONS_FILE}")
        return
    
    with open(QUESTIONS_FILE) as f:
        questions = [json.loads(line) for line in f if line.strip()]
    
    classified = []
    for q in questions:
        c = classify(q)
        classified.append(c)
    
    if filter_system:
        classified = [c for c in classified if c.get("system", "").lower() == filter_system]
    if filter_subject:
        classified = [c for c in classified if c.get("subject", "").lower() == filter_subject]
    
    with open(OUTPUT_FILE, "w") as f:
        for c in classified:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    
    sys_by_sys = defaultdict(int)
    for c in classified:
        sys_by_sys[c.get("system", "Unknown")] += 1
    
    print(f"[CLASSIFY] {len(classified)} questions written to {OUTPUT_FILE}")
    for sys_name, count in sorted(sys_by_sys.items(), key=lambda x: -x[1]):
        print(f"  {sys_name}: {count}")
    
    return classified

if __name__ == "__main__":
    main()
