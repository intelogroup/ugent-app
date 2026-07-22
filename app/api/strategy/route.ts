import { NextResponse } from "next/server";
import { analyzeQuestions, FIRST_AID_MAP, PATHOMA_MAP, PSYCH_DRUG_KEYWORDS } from "@/lib/curriculum/analyzer";
import { readDataFile } from "@/lib/data-source";
import type { TopicType } from "@/lib/curriculum/types";
import type { KnowledgeGraph, KnowledgeGraphEdge } from "@/lib/strategy/knowledge-graph";
import { systemNodeId } from "@/lib/strategy/knowledge-graph";

export const dynamic = "force-dynamic";

const TOPIC_TYPES = new Set<TopicType>([
  "DISEASE",
  "PRINCIPLE",
  "DRUG",
  "PATHOGEN",
  "SYNDROME",
  "CONCEPT",
]);

function normalizeTopicType(type: string): TopicType {
  return TOPIC_TYPES.has(type as TopicType) ? type as TopicType : "CONCEPT";
}

function mapSystem(rawSystem: string, rawSubject?: string): string {
  const s = rawSystem.toLowerCase();
  const subj = rawSubject ? rawSubject.toLowerCase() : "";

  if (s.includes("pulmonary") || s.includes("respiratory") || s.includes("pulmonology")) return "Respiratory";
  if (s.includes("cardio") || s.includes("cardiac") || s.includes("vascular") || s.includes("circulatory")) return "Cardiovascular";

  // Hematology before Neurology — "Hematologic and Nervous Systems" should be Hematology
  if (s.includes("hematologic") || s.includes("hematology") || s.includes("hematopoietic") || s.includes("oncology") || s.includes("neoplasm") || s.includes("neoplasia") || s.includes("neoplastic") || s.includes("coagulation") || s.includes("lymphatic") || s.includes("lymphoma") || s.includes("leukemia") || s.includes("reticuloendothelial")) return "Hematology & Oncology";

  if (s.includes("nervous") || s.includes("neuro") || s.includes("cns")) return "Neurology";

  // GI: avoid "gi" substring match inside "hematologi*" — use word boundary approach
  if (s.includes("gastro") || s.includes("digestive") || s.includes("hepatic") || s.includes("liver") || s.includes("biliary") || s.includes("gallbladder") || s.includes("pancreas") || /\bgi\b/.test(s)) return "Gastrointestinal";

  if (s.includes("endocrine") || s.includes("thyroid") || s.includes("adrenal") || s.includes("pituitary") || s.includes("hypothalamus")) return "Endocrine";
  if (s.includes("renal") || s.includes("urinary") || s.includes("urology") || s.includes("genitourinary") || s.includes("urogenital")) return "Renal";

  if (s.includes("rheum") || s.includes("ortho") || s.includes("musculo") || s.includes("muscular") || s.includes("muscle") || s.includes("skeletal") || s.includes("connective tissue")) return "Musculoskeletal";
  if (s.includes("psych") || s.includes("behavioral") || s.includes("mental") || s.includes("psychosocial")) return "Psychiatry";

  // Genetics before Reproductive — "Genetic / Reproductive" should go to Genetics
  if (s.includes("genetic") || s.includes("dna") || s.includes("rna") || s.includes("chromosome") || s.includes("hereditary") || s.includes("inheritance")) return "Genetics";

  // Biochemistry
  if (s.includes("biochem") || s.includes("molecular") || s.includes("cellular") || s.includes("metabolic") || s.includes("metabolism") || s.includes("nutrition") || s.includes("lysosomal") || s.includes("storage disorder")) return "Biochemistry";

  if (s.includes("female") || s.includes("male") || s.includes("ob") || s.includes("gyn") || s.includes("reproductive") || s.includes("breast") || s.includes("fetal development")) return "Reproductive";
  if (s.includes("infectious") || s.includes("microbiology") || s.includes("bacteriology") || s.includes("viral")) return "Infectious Disease";
  if (s.includes("allergy") || s.includes("immuno") || s.includes("immune") || s.includes("autoimmune")) return "Immunology";

  // Dermatology — BEFORE ENT to prevent "integumentary" matching bare "ent"
  if (s.includes("integumentary") || s.includes("dermat") || s.includes("skin") || s.includes("cutaneous")) return "Dermatology";

  // ENT — no bare "ent" (is a substring of "integumentary")
  if (s.includes("ear") || s.includes("nose") || s.includes("throat") || s.includes("auditory") || s.includes("vestibular") || s.includes("head and neck") || s.includes("oral") || s.includes("otolaryngology") || s.includes("otorhinolaryngology") || s.includes("pharyngeal") || s.includes("craniofacial") || s === "ent") return "ENT";

  if (s.includes("ophthal") || s.includes("ocular") || s.includes("eye") || s.includes("visual") || s.includes("retina") || s.includes("sensory")) return "Ophthalmology";
  if (s.includes("pharmaco") || s.includes("antimicrobial") || s.includes("antibiotic") || s.includes("chemotherapy") || s.includes("pharm") || s.includes("poison") || s.includes("toxic")) return "Pharmacology";
  if (s.includes("biostat") || s.includes("epidemiol") || s.includes("statistics") || s.includes("public health") || s.includes("preventive") || s.includes("population health")) return "Biostatistics & Epidemiology";
  if (s.includes("ethic") || s.includes("legal") || s.includes("jurisprudence") || s.includes("bioethic")) return "Social Sciences";

  // Subject Fallbacks
  if (subj.includes("biostat") || subj.includes("epidemiol") || subj.includes("statistics")) return "Biostatistics & Epidemiology";
  if (subj.includes("ethic") || subj.includes("legal") || subj.includes("policy") || subj.includes("safety") || subj.includes("communication") || subj.includes("professionalism") || subj.includes("public health") || subj.includes("healthcare") || subj.includes("preventive") || subj.includes("geriatric")) return "Social Sciences";
  if (subj.includes("pharm") || subj.includes("toxicology")) return "Pharmacology";
  if (subj.includes("biochem") || subj.includes("nutrition")) return "Biochemistry";
  if (subj.includes("microbiol") || subj.includes("virolog") || subj.includes("critical care")) return "Infectious Disease";
  if (subj.includes("immunol") || subj.includes("allergy")) return "Immunology";
  if (subj.includes("genetics")) return "Genetics";
  if (subj.includes("psych") || subj.includes("behavior")) return "Psychiatry";
  if (subj.includes("neuro")) return "Neurology";
  if (subj.includes("cardio")) return "Cardiovascular";
  if (subj.includes("pulmon")) return "Respiratory";
  if (subj.includes("gastro") || subj.includes("hepat")) return "Gastrointestinal";
  if (subj.includes("endocrin")) return "Endocrine";
  if (subj.includes("nephro") || subj.includes("urolog")) return "Renal";
  if (subj.includes("rheum") || subj.includes("ortho")) return "Musculoskeletal";
  if (subj.includes("dermat")) return "Dermatology";
  if (subj.includes("obstet") || subj.includes("reproduct")) return "Reproductive";
  if (subj.includes("pediatr")) return "Pediatrics";

  return "Other";
}

export async function GET() {
  try {
    const analysis = await analyzeQuestions();
    const allNodes = analysis.allNodes;

    // Build graphData for StrategyGraphExplorer
    // Group: system -> topicType -> diseaseName -> count
    type LeafData = { diseaseName: string; count: number; successRate: number | null };
    type TypeData = { topicType: string; count: number; diseases: LeafData[] };
    type SystemData = { system: string; total: number; topicTypes: TypeData[] };

    const systemMap = new Map<string, Map<string, LeafData[]>>();
    const nodeSystems = new Map<string, Set<string>>();

    for (const node of allNodes) {
      if (!node.name) continue;

      const rawEntries = node.entries && node.entries.length > 0
        ? node.entries
        : [{ system: node.system, subject: node.subject }];
      const normalizedSystems = rawEntries.map(({ system, subject }) => mapSystem(system || "Other", subject));
      
      // Map cross-cutting subjects to basic science system circles
      const rawSubjects = node.subjects && node.subjects.length > 0 ? node.subjects : [node.subject];
      for (const subj of rawSubjects) {
        const sLower = (subj || '').toLowerCase();
        if (sLower.includes('genetic')) normalizedSystems.push('Genetics');
        if (sLower.includes('pharm')) normalizedSystems.push('Pharmacology');
        if (sLower.includes('biochem')) normalizedSystems.push('Biochemistry');
        if (sLower.includes('immun')) normalizedSystems.push('Immunology');
        if (sLower.includes('microbiol') || sLower.includes('virolog')) normalizedSystems.push('Infectious Disease');
        if (sLower.includes('psych') || sLower.includes('behavior')) normalizedSystems.push('Psychiatry');
        if (sLower.includes('biostat') || sLower.includes('epidemiol') || sLower.includes('statistics')) normalizedSystems.push('Biostatistics & Epidemiology');
        if (sLower.includes('ethic') || sLower.includes('legal') || sLower.includes('policy')) normalizedSystems.push('Social Sciences');
        if (sLower.includes('pediatr')) normalizedSystems.push('Pediatrics');
      }

      // Special syndrome-specific system mapping rules
      const nameLower = node.name.toLowerCase();
      if (nameLower.includes('turner syndrome')) {
        normalizedSystems.push('Genetics', 'Reproductive', 'Cardiovascular');
      }
      if (nameLower.includes('down syndrome')) {
        normalizedSystems.push('Genetics', 'Pediatrics', 'Cardiovascular');
      }
      if (nameLower.includes('li-fraumeni')) {
        normalizedSystems.push('Genetics', 'Hematology & Oncology');
      }
      if (nameLower.includes('potter sequence') || nameLower.includes('potter syndrome')) {
        normalizedSystems.push('Renal', 'Pediatrics', 'Respiratory');
      }
      if (nameLower.includes('tumor lysis')) {
        normalizedSystems.push('Hematology & Oncology', 'Renal', 'Biochemistry');
      }
      if (nameLower.includes('siadh') || nameLower.includes('syndrome of inappropriate antidiuretic')) {
        normalizedSystems.push('Endocrine', 'Neurology', 'Renal');
      }
      if (nameLower.includes('ipex syndrome')) {
        normalizedSystems.push('Immunology', 'Endocrine', 'Gastrointestinal');
      }
      if (nameLower.includes('multiple endocrine neoplasia') || nameLower.includes('men1') || nameLower.includes('men2')) {
        normalizedSystems.push('Endocrine', 'Genetics');
      }
      if (nameLower.includes('fat embolism')) {
        normalizedSystems.push('Respiratory', 'Musculoskeletal');
      }
      if (nameLower.includes('amniotic fluid embol')) {
        normalizedSystems.push('Reproductive', 'Respiratory', 'Hematology & Oncology');
      }
      if (nameLower.includes('jarisch-herxheimer')) {
        normalizedSystems.push('Infectious Disease', 'Immunology');
      }
      if (nameLower.includes('wilson disease') || nameLower.includes("wilson's disease")) {
        normalizedSystems.push('Gastrointestinal', 'Neurology', 'Ophthalmology', 'Genetics');
      }
      if (nameLower.includes('alport syndrome')) {
        normalizedSystems.push('Renal', 'Ophthalmology', 'ENT', 'Genetics');
      }
      if (nameLower.includes('marfan syndrome')) {
        normalizedSystems.push('Cardiovascular', 'Musculoskeletal', 'Ophthalmology', 'Genetics');
      }

      if (node.type === 'DRUG' || node.type === 'SYNDROME') {
        if (PSYCH_DRUG_KEYWORDS.some(k => nameLower.includes(k))) {
          normalizedSystems.push('Psychiatry');
        }
      }

      const uniqueSystems = [...new Set(normalizedSystems)];

      for (let system of uniqueSystems) {
        let topicType = node.type;

        // Force SYNDROME category if name contains "syndrome" or "sequence"
        if (nameLower.includes('syndrome') || nameLower.includes('sequence')) {
          topicType = 'SYNDROME';
        }

        // Route reproductive diseases to male/female buckets
        if (system === "Reproductive") {
          const dl = node.name.toLowerCase();
          const maleKeywords = ["prostate", "testicular", "testis", "penile", "penis", "semen", "sperm", "scrotal", "scrotum", "vas deferens", "vasectomy", "priapism", "seminoma", "benign prostatic hyperplasia", "erectile", "androsten", "5-alpha", "5α", "cryptorchid"];
          const femaleKeywords = ["ovarian", "ovary", "uterine", "uterus", "endometr", "cervical", "cervix", "vaginal", "vagina", "vulvar", "vulva", "fallopian", "mammary", "breast cancer", "fibrocystic breast", "endometriosis", "leiomyoma", "dermoid cyst", "mature cystic", "menarche", "menses", "menstrual", "menopause", "dysmenorrhea", "pelvic organ prolapse", "imperforate hymen", "müllerian", "hysterectomy", "oophorectom"];
          if (maleKeywords.some(k => dl.includes(k))) {
            system = "Male Reproductive";
          } else if (femaleKeywords.some(k => dl.includes(k))) {
            system = "Female Reproductive";
          }
        }

        if (!nodeSystems.has(node.id)) nodeSystems.set(node.id, new Set());
        nodeSystems.get(node.id)!.add(system);

        if (node.type === "PRINCIPLE") continue;

        if (!systemMap.has(system)) {
          systemMap.set(system, new Map());
        }
        const typeMap = systemMap.get(system)!;

        if (!typeMap.has(topicType)) {
          typeMap.set(topicType, []);
        }
        const diseases = typeMap.get(topicType)!;

        if (!diseases.some(d => d.diseaseName === node.name)) {
          diseases.push({
            diseaseName: node.name,
            count: node.questionCount,
            successRate: null,
          });
        }
      }
    }

    const graphData: SystemData[] = [];
    for (const [system, typeMap] of systemMap.entries()) {
      const topicTypes: TypeData[] = [];
      let systemTotal = 0;

      for (const [topicType, diseases] of typeMap.entries()) {
        const typeTotal = diseases.reduce((sum, d) => sum + d.count, 0);
        systemTotal += typeTotal;
        topicTypes.push({
          topicType,
          count: diseases.length,
          diseases: diseases.sort((a, b) => b.count - a.count),
        });
      }

      graphData.push({
        system,
        total: systemTotal,
        topicTypes: topicTypes.sort((a, b) => b.count - a.count),
      });
    }

    // Sort systems by total count
    graphData.sort((a, b) => b.total - a.total);

    const prerequisiteTargets = new Map<string, Set<string>>();
    for (const edge of analysis.graph.edges) {
      if (!prerequisiteTargets.has(edge.from)) prerequisiteTargets.set(edge.from, new Set());
      prerequisiteTargets.get(edge.from)!.add(edge.to);
    }

    const retainedTopics = allNodes.filter(
      (node) => node.type !== "PRINCIPLE" || (prerequisiteTargets.get(node.id)?.size ?? 0) >= 2,
    );
    const retainedTopicIds = new Set(retainedTopics.map((node) => node.id));
    const systemTotals = new Map(graphData.map((system) => [system.system, system.total]));
    const systemNames = new Set(graphData.map((system) => system.system));
    for (const node of retainedTopics) {
      for (const system of nodeSystems.get(node.id) ?? []) systemNames.add(system);
    }

    const knowledgeNodes: KnowledgeGraph["nodes"] = [
      ...[...systemNames].map((system) => ({
        id: systemNodeId(system),
        label: system,
        type: "SYSTEM" as const,
        questionCount: systemTotals.get(system) ?? 0,
        systems: [system],
        clues: [],
        discriminators: [],
      })),
      ...retainedTopics.map((node) => ({
        id: node.id,
        label: node.name,
        type: normalizeTopicType(node.type),
        questionCount: node.questionCount,
        systems: [...(nodeSystems.get(node.id) ?? [])],
        clues: node.highLeverageClues.slice(0, 6),
        discriminators: node.discriminators.slice(0, 6),
      })),
    ];

    const edgeMap = new Map<string, KnowledgeGraphEdge>();
    const addEdge = (edge: KnowledgeGraphEdge) => {
      const existing = edgeMap.get(edge.id);
      if (existing) {
        existing.weight += edge.weight;
      } else {
        edgeMap.set(edge.id, edge);
      }
    };

    for (const node of retainedTopics) {
      for (const system of nodeSystems.get(node.id) ?? []) {
        addEdge({
          id: `belongs:${node.id}:${systemNodeId(system)}`,
          source: node.id,
          target: systemNodeId(system),
          type: "BELONGS_TO",
          weight: Math.max(node.questionCount, 1),
          directed: false,
        });
      }
    }

    for (const edge of analysis.graph.edges) {
      if (!retainedTopicIds.has(edge.from) || !retainedTopicIds.has(edge.to)) continue;
      addEdge({
        id: `prerequisite:${edge.from}:${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: "PREREQUISITE_FOR",
        weight: 1,
        directed: true,
      });
    }

    const sharedSystemWeights = new Map<string, { source: string; target: string; weight: number }>();
    for (const node of retainedTopics) {
      if (node.type === "PRINCIPLE") continue;
      const systems = nodeSystems.get(node.id) ?? new Set<string>();
      const ids = [...systems].map(systemNodeId).sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const id = `shared:${ids[i]}:${ids[j]}`;
          const current = sharedSystemWeights.get(id);
          sharedSystemWeights.set(id, {
            source: ids[i],
            target: ids[j],
            weight: (current?.weight ?? 0) + 1,
          });
        }
      }
    }

    for (const [id, edge] of sharedSystemWeights) {
      addEdge({
        id,
        source: edge.source,
        target: edge.target,
        type: "SHARES_CONCEPT",
        weight: edge.weight,
        directed: false,
      });
    }

    const knowledgeGraph: KnowledgeGraph = {
      nodes: knowledgeNodes,
      edges: [...edgeMap.values()],
    };

    // Build geneticsPairs from JSON
    let geneticsPairs: any[] = [];
    try {
      const geneticsJson = JSON.parse(await readDataFile('genetics-discriminators.json'));
      geneticsPairs = geneticsJson.topics || [];
    } catch (err) {
      console.error("Failed to parse genetics-discriminators.json", err);
    }

    // Build dynamic question bank clues
    const questionBankClues = allNodes
      .filter((n) => n.type !== "PRINCIPLE" && (n.highLeverageClues.length > 0 || n.discriminators.length > 0))
      .map((n) => ({
        id: n.id,
        diseaseName: n.name,
        topicType: n.type,
        system: mapSystem(n.system || "Other", n.subject),
        clues: n.highLeverageClues,
        discriminators: n.discriminators,
      }));

    return NextResponse.json({
      graphData,
      knowledgeGraph,
      geneticsPairs,
      questionBankClues,
      firstAidMap: FIRST_AID_MAP,
      pathomaMap: PATHOMA_MAP,
    });
  } catch (error) {
    console.error("Failed to generate strategy data:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy data", details: String(error) },
      { status: 500 }
    );
  }
}
