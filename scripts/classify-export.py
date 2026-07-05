#!/usr/bin/env python3
"""
Read exported Convex data, classify uncategorized questions, normalize system/subject names,
and produce updated JSONL files for re-import.

Usage:
  python3 scripts/classify-export.py /tmp/convex-data /tmp/convex-data-cleaned
"""

import json, os, sys, shutil
from collections import Counter

SYSTEM_NAME_MAP = {
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
    "Pancreas": "Endocrine", "Metabolism": "Endocrine",
    "Metabolic": "Endocrine", "Thermoregulation": "Endocrine",
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
    "Liver": "Gastrointestinal",
    "Renal": "Renal", "Urinary": "Renal", "Nephrology": "Renal",
    "Kidney": "Renal", "Renal/Electrolytes": "Renal", "Renal/Urology": "Renal",
    "Infectious Disease": "Infectious Disease", "Infectious Diseases": "Infectious Disease",
    "Microbiology": "Infectious Disease", "Bacteriology": "Infectious Disease",
    "Psychiatry": "Psychiatry", "Mental Health": "Psychiatry",
    "Psychiatric": "Psychiatry", "Behavioral": "Psychiatry",
    "Behavioral Health": "Psychiatry", "Psychology": "Psychiatry",
    "Musculoskeletal": "Musculoskeletal", "Skeletal": "Musculoskeletal",
    "Rheumatology": "Musculoskeletal", "Orthopedics": "Musculoskeletal",
    "Immunology": "Immunology", "Immune System": "Immunology",
    "Immune": "Immunology", "Allergy/Immunology": "Immunology",
    "Immune system": "Immunology",
    "Integumentary": "Integumentary", "Skin": "Integumentary",
    "Dermatology": "Integumentary",
    "General Principles": "Cardiovascular",
    "Mixed": "Cardiovascular", "None": "Cardiovascular", "N/A": "Cardiovascular",
    "Pharmacology": "Cardiovascular", "Pharmacokinetics": "Cardiovascular",
    "Toxicology": "Cardiovascular",
    "Physiology": "Cardiovascular", "Cell Biology": "Cardiovascular",
    "Molecular Biology": "Cardiovascular", "Genetics": "Cardiovascular",
    "Genetic": "Cardiovascular", "Genetic Disorders": "Cardiovascular",
    "Genetic Regulation": "Cardiovascular", "Genetics/Metabolism": "Cardiovascular",
    "Developmental": "Neurology",
    "Surgical": "Gastrointestinal", "General Surgery": "Gastrointestinal",
    "Otolaryngology": "Neurology", "Ear, Nose, and Throat": "Neurology",
    "General": "Cardiovascular", "Cardiology": "Cardiovascular",
    "Cerebrovascular": "Neurology",
    "Legal": "Psychiatry", "Legal/Ethics": "Psychiatry",
    "Professionalism": "Psychiatry", "Patient Care": "Psychiatry",
    "Communication Skills": "Psychiatry",
    "Healthcare": "Psychiatry", "Public Health": "Psychiatry",
    "Population Health": "Psychiatry", "Healthcare System": "Psychiatry",
    "Diagnostic Testing": "Cardiovascular",
    "Research": "Neurology", "Research Design": "Neurology",
    "Clinical Research": "Neurology", "Statistics": "Neurology",
    "Statistical Analysis": "Neurology", "Epidemiology": "Neurology",
    "Autonomic Nervous System": "Neurology",
    "Neonatology": "Cardiovascular", "Sleep Disorders": "Neurology",
    "Connective Tissue": "Musculoskeletal",
    "Signal Transduction": "Cardiovascular",
    "Visual": "Neurology", "Sensory": "Neurology",
    "Psychiatric Disorders": "Psychiatry", "Psychiatry/Behavioral Health": "Psychiatry",
    "Endocrine/Metabolic": "Endocrine", "Endocrine/Neurologic": "Endocrine",
    "Reproductive Endocrinology": "Reproductive",
    "Respiratory, Immune": "Respiratory",
    "Musculoskeletal/Neurology": "Musculoskeletal",
    "Head and neck": "Neurology", "Head & Neck": "Neurology",
    "Cardiovascular/Endocrinology": "Cardiovascular",
    "Neoplasms, Endocrine": "Endocrine",
    "Visual & Endocrine": "Neurology",
    "Cardiovascular/Pulmonary": "Cardiovascular",
    "Hepatobiliary System": "Gastrointestinal", "Hepatic System": "Gastrointestinal",
    "Hepatic Metabolism": "Gastrointestinal",
    "Gallbladder": "Gastrointestinal", "Liver/Gastrointestinal": "Gastrointestinal",
    "Skin & Lymphatic": "Integumentary",
    "Endocrine System": "Endocrine", "Endocrine/Biochemistry": "Endocrine",
    "Hypothalamic-Pituitary": "Endocrine",
    "Hypothalamus-Pituitary-Thyroid Axis": "Endocrine",
    "Pancreatic Endocrine Disorder": "Endocrine",
    "Adrenal gland": "Endocrine", "Adrenal System": "Endocrine",
    "Metabolic/Endocrine": "Endocrine", "Gender Identity": "Psychiatry",
    "Genetic/Metabolic": "Endocrine", "Metabolic and Endocrine": "Endocrine",
    "Metabolic/Genetic": "Endocrine",
    "Hematopoietic and Lymphoreticular System": "Hematology & Oncology",
    "Blood and Lymphoreticular": "Hematology & Oncology",
    "Blood & Lymphoreticular": "Hematology & Oncology",
    "Blood System": "Hematology & Oncology",
    "Blood and Coagulation": "Hematology & Oncology",
    "Blood and Lymphatic System": "Hematology & Oncology",
    "Hematologic/Oncology": "Hematology & Oncology",
    "Hematologic/Immunologic": "Hematology & Oncology",
    "Hematologic system": "Hematology & Oncology",
    "Hematologic Disorders": "Hematology & Oncology",
    "Hematology/Immunology": "Hematology & Oncology",
    "Respiratory system": "Respiratory",
    "Respiratory/Cardiovascular": "Respiratory",
    "Urinary": "Renal", "Renal and Genitourinary": "Renal",
    "Cardiovascular, Endocrine": "Cardiovascular",
    "Musculoskeletal/Nervous": "Musculoskeletal",
    "EENT": "Neurology",
    "Neuromuscular system": "Neurology",
    "Opthalmology": "Neurology", "Retina": "Neurology",
    "Neurosurgery": "Neurology", "Cranial Nerves": "Neurology",
    "Basal Ganglia": "Neurology", "Peripheral Nerve": "Neurology",
    "Neuroanatomy": "Neurology", "Neuroembryology": "Neurology",
    "Neurology/Psychiatry": "Neurology",
    "Neurology/Infectious Diseases": "Neurology",
    "Neurosciences": "Neurology",
    "Nervous Systems": "Neurology", "Neuro": "Neurology",
    "Muscular/Neuromuscular Junction": "Neurology",
    "Adaptive Immune System": "Immunology",
    "Autoimmune System": "Immunology",
    "Lymphatic/Immune": "Immunology",
    "Population Genetics": "Cardiovascular",
    "Population Demographics": "Cardiovascular",
    "Demographics": "Cardiovascular",
    "Cardiovascular/Anesthesiology": "Cardiovascular",
    "Cardiovascular/Neurology": "Cardiovascular",
    "Cardiac": "Cardiovascular",
    "Circulatory": "Cardiovascular", "Circulatory system": "Cardiovascular",
    "Systemic": "Cardiovascular",
    "Gastrointestinal system": "Gastrointestinal",
    "Digestive system": "Gastrointestinal",
    "Auditory System": "Neurology", "Auditory": "Neurology",
    "Visual system": "Neurology",
    "Skeletal System": "Musculoskeletal", "Skeletal system": "Musculoskeletal",
    "Musculoskeletal system": "Musculoskeletal",
    "Musculoskeletal and Connective Tissue": "Musculoskeletal",
    "Muscular": "Musculoskeletal",
    "Musculoskeletal / Pulmonary": "Musculoskeletal",
    "Behavioral science": "Psychiatry",
    "Behavioral Sciences": "Psychiatry",
    "Developmental/Behavioral": "Psychiatry",
    "Developmental/Behavioral Pediatrics": "Psychiatry",
    "Developmental Pediatrics": "Pediatrics",
    "Developmental Biology": "Neurology",
    "Psychiatric Defense Mechanisms": "Psychiatry",
    "Psychiatric disorders": "Psychiatry",
    "Psychological": "Psychiatry",
    "Health Psychology": "Behavioral Science",
    "Healthcare Coverage": "Psychiatry",
    "Healthcare Systems": "Psychiatry",
    "Legal and Regulatory": "Psychiatry",
    "Legal/Ethical": "Psychiatry",
    "Legal/Administrative": "Psychiatry",
    "Professionalism and Ethics": "Psychiatry",
    "Ethics in Medicine": "Behavioral Science",
    "Patient Communication and Safety": "Psychiatry",
    "Swallowing Mechanics": "Gastrointestinal",
    "Ophthalmology, Respiratory": "Neurology",
    "Surgical Safety": "Gastrointestinal",
    "Thoracic anatomy": "Cardiovascular",
    "Cellular": "Cardiovascular",
    "Central Dogma": "Cardiovascular",
    "Cell Cycle Regulation": "Cardiovascular",
    "Cytoplasm": "Cardiovascular",
    "Amino Acid Metabolism": "Endocrine",
    "General Pharmacology": "Pharmacology",
    "Bacterial Processes": "Infectious Disease",
    "Genetic Mechanisms": "Cardiovascular",
    "Neurology": "Neurology",
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
    "Musculoskeletal System": "Musculoskeletal",
}

SUBJECT_NAME_MAP = {
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
    "Anaphylaxis": "Immunology",
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
    "Respiratory": "Pathology",
    "Cardiovascular": "Pathology",
    "Neurology/Endocrinology": "Neurology",
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
    "Hematology": "Pathology",
    "Renal": "Pathology",
    "Ophthalmology/Neurology": "Neurology",
    "Hematology-Oncology": "Pathology",
    "Neuro-oncology": "Pathology",
    "Endocrine": "Pathology",
    "Musculoskeletal": "Pathology",
    "None": "Pathology",
    "Endocrine System": "Endocrinology",
    "Integumentary": "Pathology",
    "Psychiatric disorders": "Psychiatry",
    "Obstetrics/Gynecology": "Pathology",
    "Renal/Electrolytes": "Pathology",
    "Endocrinology/Neurology": "Endocrinology",
    "Menopause": "Pathology",
    "Healthcare Systems": "Behavioral Science",
    "Allergy and Immunology": "Microbiology",
    "Allergy/Immunology": "Microbiology",
    "Anaphylaxis": "Microbiology",
    "Anatomy/Neuroanatomy": "Pathology", "Anatomy/Neurology": "Pathology",
    "Anesthesia": "Pharmacology", "Anesthesia and Pathophysiology": "Pharmacology",
    "Behavioral Medicine": "Behavioral Science",
    "Biochemistry/Genetics": "Pathology", "Biochemistry/Physiology": "Pathology",
    "Bone Disorders": "Pathology",
    "Breast Pathology": "Pathology",
    "Cardiology/Pulmonology": "Pathology",
    "Cardiovascular Physiology": "Physiology",
    "Cell Biology": "Pathology",
    "Clinical Communication/Ethics": "Behavioral Science",
    "Clinical Pharmacology": "Pharmacology",
    "Clinical Research": "Biostatistics & Epidemiology",
    "Communication in Healthcare": "Behavioral Science",
    "Complement and immune response": "Microbiology",
    "Critical Care": "Pathology",
    "Dermatology / Pharmacology": "Dermatology",
    "Diagnostic Tests": "Pathology",
    "Embryology, Teratology": "Pathology",
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
    "Hematology-Oncology": "Pathology",
    "Hematology/Genetics": "Pathology",
    "Hepatology": "Pathology",
    "Histology": "Pathology",
    "Hypertension": "Pathology",
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
    "Muscular Dystrophies": "Pathology",
    "Musculoskeletal Disorders": "Pathology",
    "Musculoskeletal System / Neurology": "Pathology",
    "Neonatology": "Pediatrics",
    "Nephrology / Transplant Medicine": "Pathology",
    "Nephrology/Endocrinology": "Pathology",
    "Nerve Injury": "Neurology",
    "Neuro-oncology": "Neurology",
    "Neuroanatomy/ENT": "Anatomy",
    "Neurology": "Neurology",
    "Neurology/Endocrinology": "Neurology",
    "Neurology/Infectious Disease": "Neurology",
    "Neuromuscular Disorders": "Neurology",
    "Neurophysiology": "Physiology",
    "Neuroscience": "Neurology",
    "Neuroscience / Otorhinolaryngology": "Neurology",
    "Neuroscience/Cardiology": "Neurology",
    "Neurosurgery": "Neurology",
    "Nutrition": "Pathology",
    "Obesity Management": "Pathology",
    "Obstetrics & Gynecology": "Pathology",
    "Obstetrics and Gynecology": "Pathology",
    "Obstetrics/Infectious Disease": "Pathology",
    "Oncology Pharmacology": "Pharmacology",
    "Oncology/Infectious Disease": "Pathology",
    "Oncology/Pathology": "Pathology",
    "Ophthalmology": "Neurology",
    "Ophthalmology/Neurology": "Neurology",
    "Orthopedic Surgery": "Pathology",
    "Otolaryngology": "Neurology",
    "Otorhinolaryngology": "Neurology",
    "Pain Management": "Pharmacology",
    "Palliative Care": "Pathology",
    "Pathophysiology": "Pathology",
    "Patient Education": "Behavioral Science",
    "Patient Management": "Pathology",
    "Pediatric Neurology": "Pediatrics",
    "Pediatrics": "Pediatrics",
    "Pediatrics, Infectious Diseases, Immunology": "Pediatrics",
    "Pediatrics, Neonatology": "Pediatrics",
    "Pediatrics/Cardiology": "Pediatrics",
    "Pediatrics/Endocrinology": "Pediatrics",
    "Pharmacogenetics": "Pharmacology",
    "Pharmacology / Endocrinology": "Pharmacology",
    "Pharmacology/Autonomic Nervous System": "Pharmacology",
    "Pharmacology/Cardiology": "Pharmacology",
    "Pharmacology/Psychiatry": "Pharmacology",
    "Postpartum Hemorrhage": "Pathology",
    "Preventive Medicine": "Behavioral Science",
    "Psychiatry/Adolescent Medicine": "Psychiatry",
    "Psychiatry/Pharmacology": "Psychiatry",
    "Psychology": "Behavioral Science",
    "Public Health/Epidemiology": "Biostatistics & Epidemiology",
    "Pulmonary": "Pathology",
    "Pulmonary Embolism": "Pathology",
    "Pulmonary and Critical Care Medicine": "Pathology",
    "Pulmonology/Behavioral Med": "Pulmonology",
    "Radiation Oncology": "Pathology",
    "Radiology": "Pathology",
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
    "Vascular Disorders": "Pathology",
    "Vascular Surgery": "Pathology",
    "Vasculitis": "Pathology",
    "Virology": "Microbiology",
    "Palliative care": "Pathology",
    "Respiratory system": "Pathology",
    "Musculoskeletal system": "Pathology",
    "Acid-Base Balance": "Pathology",
    "Acid-Base Disorders": "Pathology",
    "Adherence to HIV treatment": "Behavioral Science",
    "Glucagonoma": "Pathology",
    "Hemophilia A": "Pathology",
    "Hypertension Management": "Pathology",
    "Informed Consent in Medical Procedures": "Behavioral Science",
    "Language Proficiency in Healthcare": "Behavioral Science",
    "Migraine Management": "Pathology",
    "Motivational Interviewing": "Behavioral Science",
    "Multiple Myeloma": "Pathology",
    "Neurology/Muscle physiology": "Neurology",
    "Neurology/Urology": "Neurology",
    "Nutrition/Deficiency": "Pathology",
    "Obstetrics and Pharmacology": "Pharmacology",
    "Ophthalmology & Endocrinology": "Neurology",
    "Ophthalmology/Oncology": "Neurology",
    "Orthopedics/Rheumatology": "Pathology",
    "Paediatrics": "Pediatrics",
    "Pain Management/Opiate Use Disorder": "Pharmacology",
    "Parathyroid and Thyroid": "Endocrinology",
    "Patient-Centered Care": "Behavioral Science",
    "Pediatrics/Immunology": "Pediatrics",
    "Pediatrics/Metabolism": "Pediatrics",
    "Pediatrics/Nephrology": "Pediatrics",
    "Pharmacology/Antibiotics": "Pharmacology",
    "Postpartum Hemorrhage Management": "Pathology",
    "Renal and Endocrinology": "Pathology",
    "Reproductive Biology": "Pathology",
    "Sexual Health": "Behavioral Science",
    "Social Medicine": "Behavioral Science",
    "Substance Use and Misuse": "Psychiatry",
    "Toxoplasmic encephalitis": "Infectious Disease",
    "Urology/Infectious Disease": "Pathology",
    "Urology/Oncology": "Pathology",
    "Wound Healing in Diabetes Mellitus": "Pathology",
    "Wound Healing": "Pathology",
    "Cell Biology and Genetics": "Pathology",
    "Clinical Ethics": "Behavioral Science",
    "Community Medicine": "Behavioral Science",
    "Electrolyte Disorders": "Pathology",
    "Epidemiology and Biostatistics": "Biostatistics & Epidemiology",
    "Ethics and Legal Issues": "Behavioral Science",
    "Evidence-Based Medicine": "Biostatistics & Epidemiology",
    "Health Policy": "Behavioral Science",
    "Healthcare Coverage": "Behavioral Science",
    "Healthcare Ethics": "Behavioral Science",
    "Medical Genetics": "Pathology",
    "Medical Informatics": "Biostatistics & Epidemiology",
    "Medical Sociology": "Behavioral Science",
    "Nephrology/Urology": "Pathology",
    "Neuroanatomy": "Pathology",
    "Obstetrics/Pediatrics": "Obstetrics",
    "Patient Communication and Safety": "Behavioral Science",
    "Pharmacology/Infectious Disease": "Pharmacology",
    "Population Health": "Biostatistics & Epidemiology",
    "Professionalism": "Behavioral Science",
    "Psychiatry/Neurology": "Psychiatry",
    "Public Health": "Biostatistics & Epidemiology",
    "Toxicology/Pharmacology": "Pharmacology",
}


def load_jsonl(path):
    docs = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    return docs


def load_systems(data_dir):
    systems = {}
    sys_by_name = {}
    path = os.path.join(data_dir, "systems", "documents.jsonl")
    if os.path.exists(path):
        for s in load_jsonl(path):
            systems[s["_id"]] = s
            sys_by_name[s["name"]] = s
    return systems, sys_by_name


def load_subjects(data_dir):
    subjects = {}
    subj_by_name = {}
    path = os.path.join(data_dir, "subjects", "documents.jsonl")
    if os.path.exists(path):
        for s in load_jsonl(path):
            subjects[s["_id"]] = s
            subj_by_name[s["name"]] = s
    return subjects, subj_by_name


def resolve_system_id(q, sys_by_name):
    raw = (q.get("system") or "").strip()
    if not raw:
        return None
    canon_name = SYSTEM_NAME_MAP.get(raw)
    if canon_name and canon_name in sys_by_name:
        return sys_by_name[canon_name]["_id"]
    for name, s in sys_by_name.items():
        if name.lower() == raw.lower():
            return s["_id"]
    return None


def resolve_subject_id(q, subj_by_name):
    raw = (q.get("subject") or "").strip()
    if not raw:
        return None
    canon_name = SUBJECT_NAME_MAP.get(raw)
    if canon_name and canon_name in subj_by_name:
        return subj_by_name[canon_name]["_id"]
    for name, s in subj_by_name.items():
        if name.lower() == raw.lower():
            return s["_id"]
    return None


def normalise_system_name(q):
    raw = (q.get("system") or "").strip()
    if not raw:
        return None
    normalized = SYSTEM_NAME_MAP.get(raw)
    if normalized:
        return normalized
    for canon, alias_list in CANONICAL_ALIASES.items():
        if raw.lower() in [a.lower() for a in alias_list]:
            return canon
    return None


def infer_difficulty(p):
    if not p:
        return "MEDIUM"
    metric = (
        len(p.get("highLeverageClues", [])) * 0.3
        + len(p.get("discriminators", [])) * 0.3
        + len(p.get("prerequisites", [])) * 0.2
        + len(p.get("keySymptoms", [])) * 0.2
    )
    if metric <= 1.5:
        return "EASY"
    if metric >= 4.0:
        return "HARD"
    return "MEDIUM"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/classify-export.py <input_dir> [output_dir]")
        sys.exit(1)

    input_dir = sys.argv[1].rstrip("/")
    output_dir = sys.argv[2] if len(sys.argv) > 2 else input_dir + "-cleaned"

    # Load canonical tables
    sys_by_name = {}
    path = os.path.join(input_dir, "systems", "documents.jsonl")
    if os.path.exists(path):
        for s in load_jsonl(path):
            sys_by_name[s["name"]] = s

    subj_by_name = {}
    path = os.path.join(input_dir, "subjects", "documents.jsonl")
    if os.path.exists(path):
        for s in load_jsonl(path):
            subj_by_name[s["name"]] = s

    topics_by_system = {}
    path = os.path.join(input_dir, "topics", "documents.jsonl")
    if os.path.exists(path):
        for t in load_jsonl(path):
            sys_id = t.get("systemId")
            if sys_id:
                topics_by_system.setdefault(sys_id, []).append(t)

    # Load patterns
    patterns_by_q = {}
    path = os.path.join(input_dir, "extracted_patterns", "documents.jsonl")
    if os.path.exists(path):
        for p in load_jsonl(path):
            patterns_by_q[p["questionId"]] = p

    # Load questions
    path = os.path.join(input_dir, "questions", "documents.jsonl")
    if not os.path.exists(path):
        print(f"ERROR: {path} not found")
        sys.exit(1)

    questions = load_jsonl(path)
    print(f"Loaded {len(questions)} questions")

    # Classification stats
    stats = Counter()
    updated_questions = 0
    system_name_fixes = 0

    for q in questions:
        patches = {}

        # Normalize system name (for ALL questions, not just uncategorized)
        raw_sys = (q.get("system") or "").strip()
        if raw_sys:
            canon = SYSTEM_NAME_MAP.get(raw_sys)
            if canon and canon != raw_sys:
                q["system"] = canon
                system_name_fixes += 1

        # Assign systemId if missing
        if not q.get("systemId"):
            sid = resolve_system_id(q, sys_by_name)
            if sid:
                q["systemId"] = sid
                stats["system_assigned"] += 1

        # Assign subjectId if missing
        if not q.get("subjectId"):
            subj_id = resolve_subject_id(q, subj_by_name)
            if subj_id:
                q["subjectId"] = subj_id
                stats["subject_assigned"] += 1

        # Assign difficulty if missing
        if not q.get("difficulty"):
            p = patterns_by_q.get(q["_id"])
            diff = infer_difficulty(p)
            q["difficulty"] = diff
            stats["difficulty_assigned"] += 1

        # Assign topicId if missing
        if not q.get("topicId") and q.get("systemId"):
            sys_topics = topics_by_system.get(q["systemId"], [])
            if sys_topics:
                p = patterns_by_q.get(q["_id"])
                dn = (p.get("diseaseName") or "").lower() if p else ""
                matched = None
                for t in sys_topics:
                    tn = t.get("name", "").lower()
                    if dn and (tn in dn or dn in tn):
                        matched = t
                        break
                if not matched and sys_topics:
                    matched = sys_topics[0]
                if matched:
                    q["topicId"] = matched["_id"]
                    stats["topic_assigned"] += 1

        updated_questions += 1

    # Summary
    print(f"\nClassification results:")
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")
    print(f"  system_name_normalized: {system_name_fixes}")
    print(f"\nCoverage after:")
    total = len(questions)
    with_sys = sum(1 for q in questions if q.get("systemId"))
    with_subj = sum(1 for q in questions if q.get("subjectId"))
    with_top = sum(1 for q in questions if q.get("topicId"))
    with_diff = sum(1 for q in questions if q.get("difficulty"))
    print(f"  systemId:  {with_sys}/{total} ({with_sys/total*100:.1f}%)")
    print(f"  subjectId: {with_subj}/{total} ({with_subj/total*100:.1f}%)")
    print(f"  topicId:   {with_top}/{total} ({with_top/total*100:.1f}%)")
    print(f"  difficulty:{with_diff}/{total} ({with_diff/total*100:.1f}%)")

    # Unique system names remaining
    raw_systems = set(q.get("system", "") for q in questions)
    raw_subjects = set(q.get("subject", "") for q in questions)
    remaining_sys = raw_systems - set(SYSTEM_NAME_MAP.keys())
    print(f"\nUnique system strings remaining: {len(remaining_sys)}")
    for s in sorted(remaining_sys):
        cnt = sum(1 for q in questions if (q.get("system") or "").strip() == s)
        print(f"  '{s}' ({cnt}x)")
    remaining_subj = raw_subjects - set(SUBJECT_NAME_MAP.keys())
    print(f"Unique subject strings remaining: {len(remaining_subj)}")
    for s in sorted(remaining_subj):
        cnt = sum(1 for q in questions if (q.get("subject") or "").strip() == s)
        print(f"  '{s}' ({cnt}x)")

    # Write output
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(os.path.join(output_dir, "questions"), exist_ok=True)

    out_path = os.path.join(output_dir, "questions", "documents.jsonl")
    with open(out_path, "w") as f:
        for q in questions:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    # Copy all other tables unmodified
    for table in os.listdir(input_dir):
        src = os.path.join(input_dir, table)
        dst = os.path.join(output_dir, table)
        if os.path.isdir(src) and table != "questions":
            shutil.copytree(src, dst)

    # Create zip for import
    import zipfile
    zip_path = output_dir + ".zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(output_dir):
            for fn in files:
                fp = os.path.join(root, fn)
                arcname = os.path.relpath(fp, output_dir)
                zf.write(fp, arcname)

    print(f"\nCleaned data: {output_dir}")
    print(f"Import zip:   {zip_path}")
    print(f"Import command: npx convex import --prod --replace {zip_path}")


if __name__ == "__main__":
    main()
