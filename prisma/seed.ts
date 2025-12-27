import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (optional - comment out if you want to keep data)
  // await prisma.subject.deleteMany({});
  // await prisma.system.deleteMany({});
  // await prisma.topic.deleteMany({});

  // 1. Create Subjects
  console.log('📚 Creating subjects...');
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { name: 'Anatomy' },
      update: {},
      create: {
        name: 'Anatomy',
        description: 'Human body structure and organization',
        displayOrder: 1,
        questionCount: 245,
      },
    }),
    prisma.subject.upsert({
      where: { name: 'Physiology' },
      update: {},
      create: {
        name: 'Physiology',
        description: 'How body systems function',
        displayOrder: 2,
        questionCount: 289,
      },
    }),
    prisma.subject.upsert({
      where: { name: 'Biochemistry' },
      update: {},
      create: {
        name: 'Biochemistry',
        description: 'Molecular and chemical processes',
        displayOrder: 3,
        questionCount: 198,
      },
    }),
    prisma.subject.upsert({
      where: { name: 'Pathology' },
      update: {},
      create: {
        name: 'Pathology',
        description: 'Disease processes and mechanisms',
        displayOrder: 4,
        questionCount: 312,
      },
    }),
    prisma.subject.upsert({
      where: { name: 'Pharmacology' },
      update: {},
      create: {
        name: 'Pharmacology',
        description: 'Drugs and their effects',
        displayOrder: 5,
        questionCount: 356,
      },
    }),
    prisma.subject.upsert({
      where: { name: 'Microbiology' },
      update: {},
      create: {
        name: 'Microbiology',
        description: 'Microorganisms and infections',
        displayOrder: 6,
        questionCount: 234,
      },
    }),
  ]);
  console.log(`✅ Created ${subjects.length} subjects\n`);

  // 2. Create Systems with Topics
  console.log('🏥 Creating medical systems and topics...');

  const systemsData = [
    {
      name: 'Allergy & Immunology',
      topics: [
        'Anaphylaxis and allergic reactions',
        'Miscellaneous',
        'Autoimmune diseases',
        'Transplant medicine',
        'Immune deficiencies',
        'Principles of immunology',
      ],
    },
    {
      name: 'Dermatology',
      topics: [
        'Skin and soft tissue infections',
        'Skin tumors and tumor-like lesions',
        'Normal structure and function of skin',
        'Inflammatory dermatoses and bullous diseases',
        'Disorders of epidermal appendages',
        'Miscellaneous',
      ],
    },
    {
      name: 'Cardiovascular System',
      topics: [
        'Aortic and peripheral artery diseases',
        'Congenital heart disease',
        'Coronary heart disease',
        'Valvular heart diseases',
        'Myopericardial diseases',
        'Cardiac arrhythmias',
        'Cardiovascular drugs',
        'Miscellaneous',
        'Hypertension',
        'Heart failure and shock',
        'Normal structure and function of the cardiovascular system',
      ],
    },
    {
      name: 'Pulmonary & Critical Care',
      topics: [
        'Pulmonary infections',
        'Obstructive lung disease',
        'Pulmonary vascular disease',
        'Miscellaneous',
        'Normal pulmonary structure and function',
        'Critical care medicine',
        'Lung cancer',
        'Interstitial lung disease',
        'Congenital and developmental anomalies',
        'Sleep disorders',
      ],
    },
    {
      name: 'Gastrointestinal & Nutrition',
      topics: [
        'Hepatic disorders',
        'Biliary tract disorders',
        'Miscellaneous',
        'Tumors of the GI tract',
        'Intestinal and colorectal disorders',
        'Congenital and developmental anomalies',
        'Normal structure and function of the GI tract',
        'Gastroesophageal disorders',
        'Pancreatic disorders',
        'Disorders of nutrition',
      ],
    },
    {
      name: 'Hematology & Oncology',
      topics: [
        'White blood cell disorders',
        'Platelet disorders',
        'Red blood cell disorders',
        'Hemostasis and thrombosis',
        'Miscellaneous',
        'Normal hematologic structure and function',
        'Principles of oncology',
        'Transfusion medicine',
        'Plasma cell disorders',
      ],
    },
    {
      name: 'Renal, Urinary Systems & Electrolytes',
      topics: [
        'Glomerular diseases',
        'Congenital and developmental anomalies',
        'Cystic kidney diseases',
        'Neoplasms of the kidneys and urinary tract',
        'Diabetes insipidus',
        'Chronic kidney disease',
        'Bone metabolism',
        'Fluid, electrolytes, and acid-base',
        'Miscellaneous',
        'Normal structure and function of the kidneys and urinary system',
        'Acute kidney injury',
        'Nephrolithiasis and urinary tract obstruction',
        'Urinary incontinence',
      ],
    },
    {
      name: 'Nervous System',
      topics: [
        'Cerebrovascular disease',
        'Hydrocephalus',
        'Neurodegenerative disorders and dementias',
        'Spinal cord disorders',
        'Disorders of peripheral nerves and muscles',
        'CNS infections',
        'Seizures and epilepsy',
        'Congenital and developmental anomalies',
        'Traumatic brain injuries',
        'Sleep disorders',
        'Headache',
        'Normal structure and function of the nervous system',
        'Miscellaneous',
        'Tumors of the nervous system',
        'Anesthesia',
        'Demyelinating diseases',
      ],
    },
    {
      name: 'Rheumatology/Orthopedics & Sports',
      topics: [
        'Arthritis and spondyloarthropathies',
        'Autoimmune disorders and vasculitides',
        'Miscellaneous',
        'Bone/joint injuries and infections',
        'Spinal disorders and back pain',
        'Metabolic bone disorders',
        'Congenital and developmental anomalies',
        'Normal structure and function of the musculoskeletal system',
        'Bone tumors and tumor-like lesions',
      ],
    },
    {
      name: 'Infectious Diseases',
      topics: [
        'Viral infections',
        'HIV and sexually transmitted infections',
        'Parasitic and helminthic infections',
        'Fungal infections',
        'Bacterial infections',
        'Antimicrobial drugs',
        'Infection control',
        'Miscellaneous',
      ],
    },
    {
      name: 'Endocrine, Diabetes & Metabolism',
      topics: [
        'Obesity and dyslipidemia',
        'Hypothalamus and pituitary disorders',
        'Reproductive endocrinology',
        'Endocrine tumors',
        'Congenital and developmental anomalies',
        'Adrenal disorders',
        'Diabetes mellitus',
        'Thyroid disorders',
        'Miscellaneous',
        'Normal structure and function of endocrine glands',
      ],
    },
    {
      name: 'Female Reproductive System & Breast',
      topics: [
        'Genitourinary tract infections',
        'Genital tract tumors and tumor-like lesions',
        'Normal structure and function of the female reproductive system and breast',
        'Congenital and developmental anomalies',
        'Menstrual disorders and contraception',
        'Breast disorders',
        'Miscellaneous',
      ],
    },
    {
      name: 'Male Reproductive System',
      topics: [
        'Normal structure and function of the male reproductive system',
        'Disorders of the male reproductive system',
      ],
    },
    {
      name: 'Pregnancy, Childbirth & Puerperium',
      topics: [
        'Disorders of pregnancy, childbirth, and puerperium',
        'Normal pregnancy, childbirth, and puerperium',
      ],
    },
    {
      name: 'Biostatistics & Epidemiology',
      topics: [
        'Probability and principles of testing',
        'Study design and interpretation',
        'Epidemiology and population health',
        'Measures and distribution of data',
        'Miscellaneous',
      ],
    },
    {
      name: 'Ear, Nose & Throat (ENT)',
      topics: ['Disorders of the ear, nose, and throat'],
    },
    {
      name: 'Psychiatric/Behavioral & Substance Use Disorder',
      topics: [
        'Psychotic disorders',
        'Anxiety and trauma-related disorders',
        'Substance use disorders',
        'Mood disorders',
        'Miscellaneous',
        'Normal behavior and development',
        'Eating disorders',
        'Personality disorders',
        'Neurodevelopmental disorders',
        'Somatoform disorders',
      ],
    },
    {
      name: 'Poisoning & Environmental Exposure',
      topics: ['Toxicology', 'Environmental exposure'],
    },
    {
      name: 'Ophthalmology',
      topics: [
        'Normal structure and function of the eye and associated structures',
        'Disorders of the eye and associated structures',
      ],
    },
    {
      name: 'Social Sciences (Ethics/Legal/Professional)',
      topics: [
        'Healthcare policy and economics',
        'Patient safety',
        'Miscellaneous',
        'Communication and interpersonal skills',
        'Medical ethics and jurisprudence',
        'System based-practice and quality improvement',
      ],
    },
    {
      name: 'Miscellaneous (Multisystem)',
      topics: ['Miscellaneous'],
    },
    {
      name: 'Biochemistry (General Principles)',
      topics: [
        'Cell and molecular biology',
        'Amino acids, proteins, and enzymes',
        'Bioenergetics and carbohydrate metabolism',
        'Lipid metabolism',
        'Miscellaneous',
      ],
    },
    {
      name: 'Genetics (General Principles)',
      topics: [
        'Clinical genetics',
        'DNA structure, replication, and repair',
        'RNA structure, synthesis, and processing',
        'Miscellaneous',
        'Gene expression and regulation',
        'Protein synthesis',
      ],
    },
    {
      name: 'Microbiology (General Principles)',
      topics: ['Virology', 'Mycology', 'Bacteriology', 'Miscellaneous', 'Parasitology'],
    },
    {
      name: 'Pathology (General Principles)',
      topics: ['Cellular pathology', 'Neoplasia', 'Inflammation and repair'],
    },
    {
      name: 'Pharmacology (General Principles)',
      topics: [
        'Drug metabolism and toxicity',
        'Pharmacokinetics',
        'Drug receptors and pharmacodynamics',
        'Miscellaneous',
      ],
    },
  ];

  let systemCount = 0;
  let topicCount = 0;

  for (let i = 0; i < systemsData.length; i++) {
    const systemData = systemsData[i];

    const system = await prisma.system.upsert({
      where: { name: systemData.name },
      update: { displayOrder: i + 1, questionCount: 0 },
      create: {
        name: systemData.name,
        displayOrder: i + 1,
        questionCount: 0,
      },
    });
    systemCount++;

    // Create topics for this system
    for (let j = 0; j < systemData.topics.length; j++) {
      const topicName = systemData.topics[j];

      await prisma.topic.upsert({
        where: {
          systemId_name: {
            systemId: system.id,
            name: topicName,
          },
        },
        update: { displayOrder: j + 1, questionCount: 0 },
        create: {
          name: topicName,
          systemId: system.id,
          displayOrder: j + 1,
          questionCount: 0,
        },
      });
      topicCount++;
    }
  }

  console.log(`✅ Created ${systemCount} systems with ${topicCount} topics\n`);

  // Summary
  console.log('📊 Database seed summary:');
  console.log(`  • ${subjects.length} Subjects`);
  console.log(`  • ${systemCount} Medical Systems`);
  console.log(`  • ${topicCount} Topics`);
  console.log('\n✨ Database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
