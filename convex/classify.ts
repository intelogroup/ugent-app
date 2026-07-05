import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const SYSTEM_NAME_MAP_BASE: Record<string, string> = {
  "Cardiovascular": "Cardiovascular",
  "Neurology": "Neurology", "Nervous System": "Neurology", "Nervous": "Neurology",
  "Central Nervous System": "Neurology", "Nervous system": "Neurology",
  "CNS": "Neurology", "Neuroscience": "Neurology", "Neurological": "Neurology",
  "Peripheral Nervous System": "Neurology", "Neuromuscular": "Neurology",
  "Neurosystem": "Neurology", "Neurosensory System": "Neurology",
  "Neuro-Muscular": "Neurology", "Nervous / ENT": "Neurology",
  "Ophthalmology": "Neurology", "Visual System": "Neurology",
  "Ocular": "Neurology", "Eye": "Neurology",
  "ENT": "Neurology", "Audiology": "Neurology",
  "Facial Structures": "Neurology", "Head and Neck": "Neurology",

  "Endocrine": "Endocrine", "Endocrine System": "Endocrine",
  "Endocrinology": "Endocrine", "Thyroid": "Endocrine",
  "Adrenal": "Endocrine", "Pituitary": "Endocrine",
  "Pancreas": "Endocrine", "Hypothalamic-Pituitary": "Endocrine",
  "Endocrine/Metabolic": "Endocrine", "Endocrine/Neurologic": "Endocrine",
  "Reproductive Endocrinology": "Reproductive",
  "Metabolism": "Endocrine", "Metabolic": "Endocrine",

  "Reproductive": "Reproductive", "Reproductive System": "Reproductive",
  "Genitourinary": "Reproductive", "Urology": "Reproductive",
  "Urogenital": "Reproductive", "Breast": "Reproductive",
  "Female Reproductive System": "Reproductive", "Male Reproductive": "Reproductive",
  "Male Reproductive System": "Reproductive", "Gynecology": "Reproductive",
  "Women's Health": "Reproductive",

  "Respiratory": "Respiratory", "Respiratory System": "Respiratory",
  "Pulmonary": "Respiratory", "Pulmonology": "Respiratory",

  "Hematology & Oncology": "Hematology & Oncology",
  "Hematology": "Hematology & Oncology", "Hematologic": "Hematology & Oncology",
  "Hematology-Oncology": "Hematology & Oncology",
  "Hematology/Oncology": "Hematology & Oncology",
  "Oncology": "Hematology & Oncology", "Heme/Onc": "Hematology & Oncology",
  "Hematologic System": "Hematology & Oncology",
  "Hematologic malignancies": "Hematology & Oncology",
  "Hematological": "Hematology & Oncology",
  "Hematopoietic System": "Hematology & Oncology",
  "Hematology / Immunology": "Hematology & Oncology",
  "Hemato-Oncology": "Hematology & Oncology",
  "Blood": "Hematology & Oncology", "Coagulation": "Hematology & Oncology",
  "Blood Coagulation": "Hematology & Oncology",
  "Lymphatic": "Hematology & Oncology", "Lymphatic System": "Hematology & Oncology", "Lymphatic system": "Hematology & Oncology",
  "Vascular": "Cardiovascular",

  "Gastrointestinal": "Gastrointestinal", "GI": "Gastrointestinal",
  "Gastroenterology": "Gastrointestinal", "Digestive": "Gastrointestinal",
  "Hepatobiliary": "Gastrointestinal", "Hepatic": "Gastrointestinal",
  "Liver": "Gastrointestinal", "Hepatic Metabolism": "Gastrointestinal",
  "Hepatobiliary System": "Gastrointestinal", "Hepatic System": "Gastrointestinal",
  "Gallbladder": "Gastrointestinal", "Liver/Gastrointestinal": "Gastrointestinal",

  "Renal": "Renal", "Urinary": "Renal", "Nephrology": "Renal",
  "Kidney": "Renal", "Renal/Electrolytes": "Renal", "Renal/Urology": "Renal",

  "Infectious Disease": "Infectious Disease",
  "Infectious Diseases": "Infectious Disease", "Microbiology": "Infectious Disease",
  "Bacteriology": "Infectious Disease",

  "Psychiatry": "Psychiatry", "Mental Health": "Psychiatry",
  "Psychiatric": "Psychiatry", "Behavioral": "Psychiatry",
  "Behavioral Health": "Psychiatry", "Psychology": "Psychiatry",
  "Psychiatry/Behavioral Health": "Psychiatry",

  "Musculoskeletal": "Musculoskeletal", "Skeletal": "Musculoskeletal",
  "Rheumatology": "Musculoskeletal", "Orthopedics": "Musculoskeletal",
  "Musculoskeletal System": "Musculoskeletal",

  "Immunology": "Immunology", "Immune System": "Immunology",
  "Immune": "Immunology", "Allergy/Immunology": "Immunology",
  "Immune system": "Immunology",
  "Respiratory, Immune": "Respiratory",

  "Integumentary": "Integumentary", "Skin": "Integumentary",
  "Dermatology": "Integumentary", "Skin/Integumentary": "Integumentary",

  "General Principles": "Cardiovascular",
  "Mixed": "Cardiovascular",
  "None": "Cardiovascular", "N/A": "Cardiovascular",
  "Not Applicable": "Cardiovascular",
  "Healthcare": "Psychiatry", "Healthcare System": "Psychiatry",
  "Public Health": "Psychiatry", "Population Health": "Psychiatry",
  "Research": "Neurology", "Research Design": "Neurology",
  "Clinical Research": "Neurology", "Statistics": "Neurology",
  "Statistical Analysis": "Neurology", "Epidemiology": "Neurology",
  "Pharmacology": "Cardiovascular", "Pharmacokinetics": "Cardiovascular",
  "Toxicology": "Cardiovascular",
  "Physiology": "Cardiovascular", "Cell Biology": "Cardiovascular",
  "Molecular Biology": "Cardiovascular", "Genetics": "Cardiovascular",
  "Genetic": "Cardiovascular", "Genetic Disorders": "Cardiovascular",
  "Genetic Regulation": "Cardiovascular", "Genetics/Metabolism": "Cardiovascular",
  "Developmental": "Neurology", "Developmental Biology": "Neurology",
  "Surgical": "Gastrointestinal",
  "General": "Cardiovascular",
  "Cardiology": "Cardiovascular",
  "Cerebrovascular": "Neurology",
  "Legal": "Psychiatry", "Legal/Ethics": "Psychiatry",
  "Professionalism": "Psychiatry",
  "Patient Care": "Psychiatry",
  "Communication Skills": "Psychiatry",
  "Diagnostic Testing": "Cardiovascular",
  "Thermoregulation": "Endocrine",
  "Autonomic Nervous System": "Neurology",
  "Otolaryngology": "Neurology",
  "Ear, Nose, and Throat": "Neurology",
  "Neonatology": "Cardiovascular",
  "Sleep Disorders": "Neurology",
  "Connective Tissue": "Musculoskeletal",
  "Signal Transduction": "Cardiovascular",
  "Visual": "Neurology",
  "Sensory": "Neurology",
  "Psychiatric Disorders": "Psychiatry",
  "Hypothalamus-Pituitary-Thyroid Axis": "Endocrine",
};
const SYSTEM_NAME_MAP_OVERRIDES: Record<string, string> = {
  "Integumentary": "Immunology", "Skin/Integumentary": "Immunology",
  "Behavioral Science": "Psychiatry",
  "Clinical Trials": "Neurology",
  "Endocrine/Neurology": "Endocrine",
  "General Medicine": "Cardiovascular",
  "Hepatobiliary system": "Gastrointestinal",
  "Multisystem": "Cardiovascular",
  "Not Applicable": "Cardiovascular", "Not applicable": "Cardiovascular",
  "Oral": "Neurology",
  "Otolaryngology / General Medicine": "Neurology",
  "Pediatrics": "Cardiovascular",
  "Research Methodology": "Neurology",
  "Adaptive Immune System": "Immunology",
  "Adrenal System": "Endocrine",
  "Adrenal gland": "Endocrine",
  "Amino Acid Metabolism": "Endocrine",
  "Auditory": "Neurology",
  "Auditory System": "Neurology",
  "Autoimmune System": "Immunology",
  "Bacterial Processes": "Infectious Disease",
  "Basal Ganglia": "Neurology",
  "Behavioral Sciences": "Psychiatry",
  "Behavioral science": "Psychiatry",
  "Blood & Lymphoreticular": "Hematology & Oncology",
  "Blood System": "Hematology & Oncology",
  "Blood and Coagulation": "Hematology & Oncology",
  "Blood and Lymphatic System": "Hematology & Oncology",
  "Blood and Lymphoreticular": "Hematology & Oncology",
  "Cardiac": "Cardiovascular",
  "Cardiovascular, Endocrine": "Cardiovascular",
  "Cardiovascular/Anesthesiology": "Cardiovascular",
  "Cardiovascular/Endocrinology": "Cardiovascular",
  "Cardiovascular/Neurology": "Cardiovascular",
  "Cardiovascular/Pulmonary": "Cardiovascular",
  "Cell Cycle Regulation": "Cardiovascular",
  "Cellular": "Cardiovascular",
  "Central Dogma": "Cardiovascular",
  "Circulatory": "Cardiovascular",
  "Circulatory system": "Cardiovascular",
  "Cranial Nerves": "Neurology",
  "Cytoplasm": "Cardiovascular",
  "Demographics": "Cardiovascular",
  "Developmental Pediatrics": "Pediatrics",
  "Developmental/Behavioral": "Psychiatry",
  "Developmental/Behavioral Pediatrics": "Psychiatry",
  "Digestive system": "Gastrointestinal",
  "EENT": "Neurology",
  "Endocrine/Biochemistry": "Endocrine",
  "Ethics in Medicine": "Behavioral Science",
  "Gastrointestinal system": "Gastrointestinal",
  "Gender Identity": "Psychiatry",
  "General Pharmacology": "Pharmacology",
  "General Surgery": "Gastrointestinal",
  "Genetic Mechanisms": "Cardiovascular",
  "Genetic/Metabolic": "Endocrine",
  "Head & Neck": "Neurology",
  "Head and neck": "Neurology",
  "Health Psychology": "Behavioral Science",
  "Healthcare Coverage": "Psychiatry",
  "Healthcare Systems": "Psychiatry",
  "Hematologic Disorders": "Hematology & Oncology",
  "Hematologic system": "Hematology & Oncology",
  "Hematologic/Immunologic": "Hematology & Oncology",
  "Hematologic/Oncology": "Hematology & Oncology",
  "Hematology/Immunology": "Hematology & Oncology",
  "Hematopoietic and Lymphoreticular System": "Hematology & Oncology",
  "Legal and Regulatory": "Psychiatry",
  "Legal/Administrative": "Psychiatry",
  "Legal/Ethical": "Psychiatry",
  "Lymphatic/Immune": "Immunology",
  "Metabolic and Endocrine": "Endocrine",
  "Metabolic/Endocrine": "Endocrine",
  "Metabolic/Genetic": "Endocrine",
  "Muscular": "Musculoskeletal",
  "Muscular/Neuromuscular Junction": "Neurology",
  "Musculoskeletal / Pulmonary": "Musculoskeletal",
  "Musculoskeletal and Connective Tissue": "Musculoskeletal",
  "Musculoskeletal system": "Musculoskeletal",
  "Musculoskeletal/Nervous": "Musculoskeletal",
  "Musculoskeletal/Neurology": "Musculoskeletal",
  "Neoplasms, Endocrine": "Endocrine",
  "Nervous Systems": "Neurology",
  "Neuro": "Neurology",
  "Neuroanatomy": "Neurology",
  "Neuroembryology": "Neurology",
  "Neurology/Infectious Diseases": "Neurology",
  "Neurology/Psychiatry": "Neurology",
  "Neuromuscular system": "Neurology",
  "Neurosciences": "Neurology",
  "Neurosurgery": "Neurology",
  "Ophthalmology, Respiratory": "Neurology",
  "Opthalmology": "Neurology",
  "Pancreatic Endocrine Disorder": "Endocrine",
  "Patient Communication and Safety": "Psychiatry",
  "Peripheral Nerve": "Neurology",
  "Population Demographics": "Cardiovascular",
  "Population Genetics": "Cardiovascular",
  "Professionalism and Ethics": "Psychiatry",
  "Psychiatric Defense Mechanisms": "Psychiatry",
  "Psychiatric disorders": "Psychiatry",
  "Psychological": "Psychiatry",
  "Renal and Genitourinary": "Renal",
  "Respiratory system": "Respiratory",
  "Respiratory/Cardiovascular": "Respiratory",
  "Retina": "Neurology",
  "Skeletal System": "Musculoskeletal",
  "Skeletal system": "Musculoskeletal",
  "Skin & Lymphatic": "Integumentary",
  "Surgical Safety": "Gastrointestinal",
  "Swallowing Mechanics": "Gastrointestinal",
  "Systemic": "Cardiovascular",
  "Thoracic anatomy": "Cardiovascular",
  "Visual & Endocrine": "Neurology",
  "Visual system": "Neurology",
};

const SYSTEM_NAME_MAP: Record<string, string> = { ...SYSTEM_NAME_MAP_BASE, ...SYSTEM_NAME_MAP_OVERRIDES };

const SUBJECT_NAME_MAP_BASE: Record<string, string> = {
  "Pathology": "Pathology",
  "Pharmacology": "Pharmacology",
  "Microbiology": "Microbiology",
  "Behavioral Science": "Behavioral Science",
  "Physiology": "Physiology",
  "Neurology": "Neurology",
  "Pediatrics": "Pediatrics",
  "Biostatistics & Epidemiology": "Biostatistics & Epidemiology",
  "Cardiology": "Pathology",
  "Nephrology": "Pathology",
  "Hematology": "Pathology",
  "Endocrinology": "Pathology",
  "Psychiatry": "Behavioral Science",
  "Oncology": "Pathology",
  "Genetics": "Pathology",
  "Dermatology": "Pathology",
  "Immunology": "Microbiology",
  "Obstetrics": "Pathology",
  "Epidemiology": "Biostatistics & Epidemiology",
  "Internal Medicine": "Pathology",
  "Rheumatology": "Pathology",
  "Pulmonology": "Pathology",
  "Urology": "Pathology",
  "Neuroscience": "Neurology",
  "Anatomy": "Pathology",
  "Ophthalmology": "Neurology",
  "Infectious Disease": "Microbiology",
  "Infectious Diseases": "Microbiology",
  "Gastroenterology": "Pathology",
  "Biostatistics": "Biostatistics & Epidemiology",
  "Hematology/Oncology": "Pathology",
  "Medical Ethics": "Behavioral Science",
  "Embryology": "Pathology",
  "Toxicology": "Pharmacology",
  "Biochemistry": "Pathology",
  "Obstetrics/Gynecology": "Pathology",
  "Obstetrics and Gynecology": "Pathology",
  "Emergency Medicine": "Pathology",
  "Anesthesiology": "Pharmacology",
  "Otolaryngology": "Neurology",
  "Pulmonary Medicine": "Pathology",
  "Orthopedics": "Pathology",
  "Medicine": "Pathology",
  "Surgery": "Pathology",
  "Renal Physiology": "Pathology",
  "Anaphylaxis": "Microbiology",
  "Hypertension": "Pathology",
  "Pulmonary Embolism": "Pathology",
  "Pediatrics, Neonatology": "Pediatrics",
  "Clinical Research": "Biostatistics & Epidemiology",
  "Muscular Dystrophies": "Pathology",
  "Pulmonary and Critical Care Medicine": "Pathology",
  "Oncology/Pathology": "Pathology",
  "Pharmacology/Cardiology": "Pharmacology",
  "Pediatric Neurology": "Pediatrics",
  "Embryology, Teratology": "Pathology",
  "Vascular Disorders": "Pathology",
  "Pharmacology / Endocrinology": "Pharmacology",
  "Anatomy/Neuroanatomy": "Anatomy",
  "Musculoskeletal Disorders": "Pathology",
  "Obesity Management": "Pathology",
  "Musculoskeletal System / Neurology": "Pathology",
  "Hematology-Oncology": "Pathology",
  "Neurology/Endocrinology": "Neurology",
  "Allergy and Immunology": "Microbiology",
  "Allergy/Immunology": "Microbiology",
  "Anesthesia": "Pharmacology",
  "Anesthesia and Pathophysiology": "Pharmacology",
  "Behavioral Medicine": "Behavioral Science",
  "Biochemistry/Genetics": "Pathology",
  "Biochemistry/Physiology": "Pathology",
  "Bone Disorders": "Pathology",
  "Bone metabolism": "Pathology",
  "Breast Pathology": "Pathology",
  "Breast pathology": "Pathology",
  "Burn Medicine": "Pathology",
  "Cardiology/Pulmonology": "Pathology",
  "Cardiovascular Physiology": "Physiology",
  "Cell Biology": "Pathology",
  "Clinical Communication/Ethics": "Behavioral Science",
  "Clinical Medicine": "Pathology",
  "Clinical Pharmacology": "Pharmacology",
  "Communication in Healthcare": "Behavioral Science",
  "Communication in Medicine": "Behavioral Science",
  "Complement and immune response": "Microbiology",
  "Critical Care": "Pathology",
  "Dermatology / Pharmacology": "Dermatology",
  "Diabetes Mellitus": "Endocrinology",
  "Diagnostic Tests": "Pathology",
  "Endocrine": "Endocrinology",
  "Endocrine/Diabetes": "Endocrinology",
  "Endocrinology / Reproductive Health": "Endocrinology",
  "Endocrinology/Oncology": "Endocrinology",
  "Epidemiology & Biostatistics": "Biostatistics & Epidemiology",
  "Ethics": "Behavioral Science",
  "Fetal physiology": "Physiology",
  "Gastrointestinal": "Pathology",
  "General Medicine": "Pathology",
  "Genetic Disorders": "Pathology",
  "Genetics/Epidemiology": "Biostatistics & Epidemiology",
  "Genetics/Oncology": "Pathology",
  "Geriatrics": "Pathology",
  "Gynecology": "Pathology",
  "Headache disorders": "Neurology",
  "Health Care Financing": "Behavioral Science",
  "Hemato-Oncology": "Pathology",
  "Hematology/Genetics": "Pathology",
  "Hepatology": "Pathology",
  "Histology": "Pathology",
  "Immunology/Allergy": "Microbiology",
  "Immunology/Infectious Disease": "Microbiology",
  "Immunology/Infectious Diseases": "Microbiology",
  "Immunology/Pharmacology": "Microbiology",
  "Infectious Mononucleosis": "Infectious Disease",
  "Infective Endocarditis": "Infectious Disease",
  "Informed Consent": "Behavioral Science",
  "Language Proficiency": "Behavioral Science",
  "Medical": "Pathology",
  "Medical Communication": "Behavioral Science",
  "Medical Pharmacology": "Pharmacology",
  "Metabolic Bone Disease": "Pathology",
  "Metabolic Disorders": "Pathology",
  "Microbiology/ Ophthalmology": "Microbiology",
  "Microbiology/Cardiology": "Microbiology",
  "Microbiology/Immunology": "Microbiology",
  "Microbiology/Infectious Disease": "Microbiology",
  "Microbiology/Infectious Diseases": "Microbiology",
  "Mixed": "Pathology",
  "Molecular Biology": "Pathology",
  "Muscle Physiology": "Physiology",
  "Musculoskeletal": "Pathology",
  "Neonatology": "Pediatrics",
  "Nephrology / Transplant Medicine": "Pathology",
  "Nephrology/Endocrinology": "Pathology",
  "Nerve Injury": "Neurology",
  "Neuro-oncology": "Neurology",
  "Neuroanatomy/ENT": "Anatomy",
  "Neurology/Infectious Disease": "Neurology",
  "Neuromuscular Disorders": "Neurology",
  "Neurophysiology": "Physiology",
  "Neuroscience / Otorhinolaryngology": "Neurology",
  "Neuroscience/Cardiology": "Neurology",
  "Neurosurgery": "Neurology",
  "Nutrition": "Pathology",
  "Obstetrics & Gynecology": "Pathology",
  "Obstetrics/Infectious Disease": "Pathology",
  "Oncology Pharmacology": "Pharmacology",
  "Oncology/Infectious Disease": "Pathology",
  "Ophthalmology/Neurology": "Neurology",
  "Orthopedic Surgery": "Pathology",
  "Otorhinolaryngology": "Neurology",
  "Pain Management": "Pharmacology",
  "Palliative Care": "Pathology",
  "Pathophysiology": "Pathology",
  "Patient Education": "Behavioral Science",
  "Patient Management": "Pathology",
  "Pediatrics, Infectious Diseases, Immunology": "Pediatrics",
  "Pediatrics/Cardiology": "Pediatrics",
  "Pediatrics/Endocrinology": "Pediatrics",
  "Pharmacogenetics": "Pharmacology",
  "Pharmacology/Autonomic Nervous System": "Pharmacology",
  "Pharmacology/Psychiatry": "Pharmacology",
  "Postpartum Hemorrhage": "Pathology",
  "Preventive Medicine": "Behavioral Science",
  "Psychiatry/Adolescent Medicine": "Psychiatry",
  "Psychiatry/Pharmacology": "Psychiatry",
  "Psychology": "Behavioral Science",
  "Public Health/Epidemiology": "Biostatistics & Epidemiology",
  "Pulmonary": "Pathology",
  "Pulmonology/Behavioral Med": "Pulmonology",
  "Radiation Oncology": "Pathology",
  "Radiology": "Pathology",
  "Renal": "Pathology",
  "Renal pathology": "Pathology",
  "Reproductive": "Pathology",
  "Reproductive Endocrinology": "Endocrinology",
  "Reproductive Medicine": "Pathology",
  "Research Design": "Biostatistics & Epidemiology",
  "Research Methodology": "Biostatistics & Epidemiology",
  "Respiratory Physiology": "Physiology",
  "Respiratory System": "Pathology",
  "Rhabdomyolysis": "Pathology",
  "Sleep Disorders": "Neurology",
  "Sleep Medicine": "Neurology",
  "Statistics": "Biostatistics & Epidemiology",
  "Thoracic Trauma": "Pathology",
  "Transfusion Medicine": "Pathology",
  "Transplant Medicine": "Pathology",
  "Transplant Surgery": "Pathology",
  "Transport Mechanisms": "Physiology",
  "Vascular Surgery": "Pathology",
  "Vasculitis": "Pathology",
  "Virology": "Microbiology",
  "Wound Healing": "Pathology",
  "Wound Healing in Diabetes Mellitus": "Pathology",
  "Informed Consent in Medical Procedures": "Behavioral Science",
  "Adherence to HIV treatment": "Behavioral Science",
  "Acid-Base Balance": "Pathology",
  "Acid-Base Disorders": "Pathology",
  "Motivational Interviewing": "Behavioral Science",
  "Glucagonoma": "Pathology",
  "Hemophilia A": "Pathology",
  "Hypertension Management": "Pathology",
  "Migraine Management": "Pathology",
  "Multiple Myeloma": "Pathology",
  "Musculoskeletal system": "Pathology",
};

const SUBJECT_NAME_MAP_OVERRIDES: Record<string, string> = {
  "Nephrology / Transplant Medicine": "Pathology",
  "Neurology/Muscle physiology": "Neurology",
  "Neurology/Urology": "Neurology",
  "Nutrition/Deficiency": "Pathology",
  "Obstetrics and Pharmacology": "Pharmacology",
  "Ophthalmology & Endocrinology": "Neurology",
  "Ophthalmology/Oncology": "Neurology",
  "Orthopedics/Rheumatology": "Pathology",
  "Pain Management/Opiate Use Disorder": "Pharmacology",
  "Palliative care": "Pathology",
  "Parathyroid and Thyroid": "Endocrinology",
  "Patient-Centered Care": "Behavioral Science",
  "Pediatrics/Immunology": "Pediatrics",
  "Pediatrics/Metabolism": "Pediatrics",
  "Pediatrics/Nephrology": "Pediatrics",
  "Pharmacology/Antibiotics": "Pharmacology",
  "Respiratory system": "Pathology",
  "Sexual Health": "Behavioral Science",
  "Social Medicine": "Behavioral Science",
  "Substance Use and Misuse": "Psychiatry",
  "Toxoplasmic encephalitis": "Infectious Disease",
  "Urology/Infectious Disease": "Pathology",
  "Urology/Oncology": "Pathology",
  "Reproductive Biology": "Pathology",
  "Patient Communication and Safety": "Behavioral Science",
  "Healthcare Systems": "Behavioral Science",
  "Paediatrics": "Pediatrics",
  "Healthcare Coverage": "Behavioral Science",
  "Ethics and Legal Issues": "Behavioral Science",
  "Electrolyte Disorders": "Pathology",
  "Healthcare Ethics": "Behavioral Science",
  "Population Health": "Biostatistics & Epidemiology",
  "Professionalism": "Behavioral Science",
  "Pharmacology/Infectious Disease": "Pharmacology",
  "Infectious Disease": "Microbiology",
  "Neuroanatomy": "Pathology",
  "Ophthalmology/Neurology": "Neurology",
  "Cell Biology and Genetics": "Pathology",
  "Community Medicine": "Behavioral Science",
  "Health Policy": "Behavioral Science",
  "Obstetrics/Pediatrics": "Obstetrics",
  "Hematology/Oncology": "Pathology",
  "Clinical Ethics": "Behavioral Science",
  "Epidemiology and Biostatistics": "Biostatistics & Epidemiology",
  "Psychiatry/Neurology": "Psychiatry",
  "Toxicology/Pharmacology": "Pharmacology",
  "Medical Genetics": "Pathology",
  "Medical Informatics": "Biostatistics & Epidemiology",
  "Public Health": "Biostatistics & Epidemiology",
  "Medical Sociology": "Behavioral Science",
  "Evidence-Based Medicine": "Biostatistics & Epidemiology",
  "Immunology/Infectious Diseases": "Microbiology",
  "Nephrology/Urology": "Pathology",
  "Obstetrics and Gynecology": "Pathology",
  "Hematology": "Pathology",
  "Endocrinology": "Pathology",
  "Pulmonology": "Pathology",
  "Dermatology": "Pathology",
  "Neuroscience": "Neurology",
  "Obstetrics": "Pathology",
  "Pediatrics": "Pediatrics",
  "Pathology": "Pathology",
  "Pharmacology": "Pharmacology",
  "Microbiology": "Microbiology",
  "Behavioral Science": "Behavioral Science",
  "Physiology": "Physiology",
  "Neurology": "Neurology",
  "Biostatistics & Epidemiology": "Biostatistics & Epidemiology",
  "Anatomy": "Pathology",
  "Bone Disorders": "Pathology",
  "Infectious Mononucleosis": "Infectious Disease",
  "Sleep Medicine": "Neurology",
  "Communication in Healthcare": "Behavioral Science",
  "Neuroanatomy/ENT": "Anatomy",
  "Nerve Injury": "Neurology",
  "Renal pathology": "Pathology",
  "Infective Endocarditis": "Infectious Disease",
  "Genetics/Epidemiology": "Biostatistics & Epidemiology",
  "Wound Healing": "Pathology",
  "Microbiology/Cardiology": "Microbiology",
  "Neuromuscular Disorders": "Neurology",
  "Dermatology / Pharmacology": "Dermatology",
  "Hemato-Oncology": "Pathology",
  "Pediatrics/Endocrinology": "Pediatrics",
  "Neuroscience/Cardiology": "Neurology",
  "Psychiatry/Adolescent Medicine": "Psychiatry",
  "Burn Medicine": "Pathology",
  "Bone metabolism": "Pathology",
  "Endocrinology/Oncology": "Endocrinology",
  "Clinical Medicine": "Pathology",
  "Endocrine/Diabetes": "Endocrinology",
  "Pediatrics/Cardiology": "Pediatrics",
  "Pharmacology/Autonomic Nervous System": "Pharmacology",
  "Pediatrics, Infectious Diseases, Immunology": "Pediatrics",
  "Headache disorders": "Neurology",
  "Breast pathology": "Pathology",
  "Transport Mechanisms": "Physiology",
  "Diabetes Mellitus": "Endocrinology",
  "Complement and immune response": "Immunology",
  "Vasculitis": "Pathology",
  "Neonatology": "Pediatrics",
  "Transplant Surgery": "Pathology",
  "Metabolic Bone Disease": "Pathology",
  "Rhabdomyolysis": "Pathology",
  "Thoracic Trauma": "Pathology",
  "Communication in Medicine": "Behavioral Science",
  "Geriatrics": "Medicine",
  "Pain Management": "Pharmacology",
  "Pulmonology/Behavioral Med": "Pulmonology",
  "Neuroscience / Otorhinolaryngology": "Neurology",
  "Breast Pathology": "Pathology",
  "Cardiovascular": "Pathology",
  "Endocrine System": "Endocrinology",
  "Endocrinology/Neurology": "Endocrinology",
  "Integumentary": "Pathology",
  "Language Proficiency in Healthcare": "Behavioral Science",
  "Menopause": "Pathology",
  "None": "Pathology",
  "Postpartum Hemorrhage Management": "Pathology",
  "Psychiatric disorders": "Psychiatry",
  "Renal and Endocrinology": "Pathology",
  "Renal/Electrolytes": "Pathology",
  "Respiratory": "Pathology",
};

const SUBJECT_NAME_MAP: Record<string, string> = { ...SUBJECT_NAME_MAP_BASE, ...SUBJECT_NAME_MAP_OVERRIDES };

// Subsystems (Anatomy, Pediatrics, etc.) mapped to their parent subject
const SUBJECT_ALIAS: Record<string, string> = {
  "Anatomy": "Pathology",
  "Pediatrics": "Pathology",
  "Neurology": "Pathology",
  "Medicine": "Pathology",
  "Pulmonology": "Pathology",
  "Dermatology": "Pathology",
  "Endocrinology": "Pathology",
  "Psychiatry": "Behavioral Science",
  "Infectious Disease": "Microbiology",
  "Anesthesiology": "Pharmacology",
};

export const classifyQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.classify.applyClassification, args);
  },
});

export const classifyAll = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db.query("questions").collect();
    const systems = await ctx.db.query("systems").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const patterns = await ctx.db.query("extracted_patterns").collect();

    const sysByName: Record<string, string> = {};
    for (const s of systems) sysByName[s.name] = s._id;

    const subjByName: Record<string, string> = {};
    for (const s of subjects) subjByName[s.name] = s._id;

    const patternByQ = new Map<string, typeof patterns[0]>();
    for (const p of patterns) patternByQ.set(p.questionId, p);

    const results: any[] = [];
    for (const q of questions) {
      const patch: Record<string, any> = {};

      // Resolve systemId
      if (!q.systemId) {
        const sid = resolveSystemId(q, sysByName, patternByQ);
        if (sid) patch.systemId = sid;
      }

      // Resolve subjectId
      if (!q.subjectId && q.subject) {
        const subjId = resolveSubjectId(q, subjByName, patternByQ);
        if (subjId) patch.subjectId = subjId;
      }

      // Resolve topicId
      if (!q.topicId && patch.systemId) {
        const tid = await resolveTopicId(ctx, q, patch.systemId, patternByQ);
        if (tid) patch.topicId = tid;
      }

      // Resolve difficulty
      if (!q.difficulty) {
        const diff = inferDifficulty(patternByQ.get(q._id));
        if (diff) patch.difficulty = diff;
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = Date.now();
        results.push({ id: q._id, patch });
        if (!args.dryRun) {
          if (patch.systemId || patch.topicId || patch.subjectId || patch.difficulty) {
            const cleanPatch: Record<string, any> = {};
            if (patch.systemId) cleanPatch.systemId = patch.systemId;
            if (patch.topicId) cleanPatch.topicId = patch.topicId;
            if (patch.subjectId) cleanPatch.subjectId = patch.subjectId;
            if (patch.difficulty) cleanPatch.difficulty = patch.difficulty;
            cleanPatch.updatedAt = patch.updatedAt;
            await ctx.db.patch(q._id, cleanPatch);
          }
        }
      }
    }

    return {
      total: questions.length,
      classified: results.length,
      details: results,
    };
  },
});

export const getClassificationPreview = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const systems = await ctx.db.query("systems").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const patterns = await ctx.db.query("extracted_patterns").collect();

    const sysByName: Record<string, string> = {};
    for (const s of systems) sysByName[s.name] = s._id;

    const subjByName: Record<string, string> = {};
    for (const s of subjects) subjByName[s.name] = s._id;

    const patternByQ = new Map<string, typeof patterns[0]>();
    for (const p of patterns) patternByQ.set(p.questionId, p);

    const uncat = questions.filter(q => !q.systemId);
    const preview: any[] = [];
    for (const q of uncat) {
      preview.push({
        _id: q._id,
        textPreview: q.text?.slice(0, 80),
        system: q.system,
        subject: q.subject,
        resolvedSystem: resolveSystemId(q, sysByName, patternByQ),
        resolvedSubject: resolveSubjectId(q, subjByName, patternByQ),
        diseaseName: patternByQ.get(q._id)?.diseaseName,
      });
    }
    return preview;
  },
});

function resolveSystemId(q: any, sysByName: Record<string, string>, patternByQ: Map<string, any>): string | null {
  const raw = (q.system || "").trim();

  // Direct name match
  const canonName = SYSTEM_NAME_MAP[raw];
  if (canonName && sysByName[canonName]) return sysByName[canonName];

  // Fallback: disease name lookup
  const p = patternByQ.get(q._id);
  if (p?.diseaseName) {
    const dn = p.diseaseName.trim();
    // Disease-based matching handled offline; fall back to first system
    const firstSys = Object.values(sysByName)[0];
    if (firstSys) return firstSys;
  }

  return null;
}

function resolveSubjectId(q: any, subjByName: Record<string, string>, patternByQ: Map<string, any>): string | null {
  const raw = (q.subject || "").trim();
  if (!raw) return null;

  // Direct name match
  if (subjByName[raw]) return subjByName[raw];

  // Alias map
  const canonName = SUBJECT_NAME_MAP[raw];
  if (canonName && subjByName[canonName]) return subjByName[canonName];

  // Fallback to parent alias
  const parentName = SUBJECT_ALIAS[raw];
  if (parentName && subjByName[parentName]) return subjByName[parentName];

  // Case-insensitive fallback
  for (const [name, sid] of Object.entries(subjByName)) {
    if (name.toLowerCase() === raw.toLowerCase()) return sid;
  }

  return null;
}

async function resolveTopicId(ctx: any, q: any, systemId: string, patternByQ: Map<string, any>): Promise<string | null> {
  const p = patternByQ.get(q._id);
  if (!p?.diseaseName) return null;

  const topics = await ctx.db
    .query("topics")
    .withIndex("by_system", (qi: any) => qi.eq("systemId", systemId))
    .take(100);

  // Try to match diseaseName to a topic name
  const dn = p.diseaseName.toLowerCase();
  for (const t of topics) {
    if (t.name.toLowerCase().includes(dn) || dn.includes(t.name.toLowerCase())) {
      return t._id;
    }
  }

  // Return the first disease-related topic
  for (const t of topics) {
    if (t.name.toLowerCase().includes("disease") || t.name.toLowerCase().includes("disorder")) {
      return t._id;
    }
  }

  return null;
}

function inferDifficulty(p: any): string | null {
  if (!p) return "MEDIUM";
  const metric =
    (p.highLeverageClues?.length || 0) * 0.3 +
    (p.discriminators?.length || 0) * 0.3 +
    (p.prerequisites?.length || 0) * 0.2 +
    (p.keySymptoms?.length || 0) * 0.2;
  if (metric <= 1.5) return "EASY";
  if (metric >= 4.0) return "HARD";
  return "MEDIUM";
}

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const sys = await ctx.db.query("systems").collect();
    const subj = await ctx.db.query("subjects").collect();

    const categorized = questions.filter(q => q.systemId).length;
    const withSubject = questions.filter(q => q.subjectId).length;
    const withDiff = questions.filter(q => q.difficulty).length;
    const withTopic = questions.filter(q => q.topicId).length;

    const systemNames = sys.map(s => s.name);
    const subjectNames = subj.map(s => s.name);

    // Count unique raw system strings
    const rawSystems = new Set(questions.filter(q => q.system).map(q => q.system));

    return {
      total: questions.length,
      categorized,
      uncategorized: questions.length - categorized,
      withSubject,
      withTopic,
      withDifficulty: withDiff,
      categoryCoverage: `${Math.round(categorized / questions.length * 100)}%`,
      subjectCoverage: `${Math.round(withSubject / questions.length * 100)}%`,
      uniqueRawSystemStrings: rawSystems.size,
      canonicalSystems: systemNames.length,
      canonicalSubjects: subjectNames.length,
      systemNames,
      subjectNames,
    };
  },
});

export const applyClassification = internalMutation({
  args: {
    questionId: v.id("questions"),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
    subjectId: v.optional(v.id("subjects")),
    difficulty: v.optional(v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"))),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.systemId) patch.systemId = args.systemId;
    if (args.topicId) patch.topicId = args.topicId;
    if (args.subjectId) patch.subjectId = args.subjectId;
    if (args.difficulty) patch.difficulty = args.difficulty;
    await ctx.db.patch(args.questionId, patch);
  },
});
