const dummyQuestion1 = `
Question 1:
A 65-year-old male with a history of chronic smoking and hypertension presents with a sudden onset of left-sided weakness and slurred speech. He has no prior history of trauma. Physical examination reveals left-sided hemiparesis and facial drooping. CT scan of the head shows a right-sided intracerebral hemorrhage.

Options:
A. Hypertensive stroke
B. Ischemic stroke
C. Subdural hematoma
D. Epidural hematoma

Correct Answer: A
Explanation:
Hypertensive stroke (intracerebral hemorrhage) is a common cause of focal neurologic deficits in elderly patients with hypertension. It typically occurs in the basal ganglia, thalamus, or pons. Ischemic strokes present similarly but would show as an area of hypodensity on a CT scan, whereas an intracerebral hemorrhage shows as hyperdensity (blood). Subdural and epidural hematomas are usually related to trauma and have characteristic shapes (crescent-shaped and lens-shaped, respectively).

---NEXT-QUESTION---

Question 2:
A 28-year-old female in her second trimester of pregnancy (24 weeks gestation) presents with a burning sensation in her chest after meals. She reports that the symptoms are worse when she lies down at night. She has no other medical conditions and is taking only prenatal vitamins.

Options:
A. Gastroesophageal reflux disease (GERD)
B. Peptic ulcer disease
C. Myocardial infarction
D. Gallstones

Correct Answer: A
Explanation:
Gastroesophageal reflux disease (GERD) is common during pregnancy due to both hormonal and mechanical factors. Progesterone relaxes the lower esophageal sphincter, allowing stomach acid to reflux into the esophagus. Peptic ulcer disease would more likely present with epigastric pain and is less common than GERD in pregnancy. Myocardial infarction is very unlikely in a young woman with no risk factors. Gallstones can cause abdominal pain but usually present with biliary colic (RUQ pain).
`;

async function main() {
  const { execSync } = require('child_process');

  try {
    // 1. Start Ingestion
    console.log("Starting ingestion...");
    const ingestionIdResult = execSync(`npx convex run ingest:startIngestion '{"rawText": "", "totalCount": 2}'`).toString().trim();
    const ingestionIdMatch = ingestionIdResult.match(/"([^"]+)"/);
    if (!ingestionIdMatch) throw new Error("Could not extract ingestionId: " + ingestionIdResult);
    const ingestionId = ingestionIdMatch[1];
    console.log(`IngestionId: ${ingestionId}`);

    // 2. Call Extract Intelligence Action
    console.log("Calling extractIntelligence action...");
    // We need to be careful with escaping here.
    const payload = JSON.stringify({ ingestionId, rawText: dummyQuestion1 });
    // Use a temporary file for the payload to avoid shell escaping issues with large text
    const fs = require('fs');
    fs.writeFileSync('payload.json', payload);
    
    execSync(`npx convex run ai:extractIntelligence < payload.json`);
    console.log("Action called. Checking status...");

    // 3. Poll for status
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const ingestionRow = execSync(`npx convex run -q -e 'async (ctx) => await ctx.db.get("${ingestionId}")'`).toString();
      console.log(`Poll ${i+1}:`, ingestionRow);
      if (ingestionRow.includes('"status": "completed"') || ingestionRow.includes('"status": "failed"')) {
        break;
      }
    }
    console.log("Extraction test finished.");
    
    // Check results
    const questionsCount = execSync(`npx convex run -q -e 'async (ctx) => (await ctx.db.query("questions").collect()).length'`).toString();
    console.log("Total Questions in DB:", questionsCount);
    
    const patternsCount = execSync(`npx convex run -q -e 'async (ctx) => (await ctx.db.query("extracted_patterns").collect()).length'`).toString();
    console.log("Total Extracted Patterns in DB:", patternsCount);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    const fs = require('fs');
    if (fs.existsSync('payload.json')) fs.unlinkSync('payload.json');
  }
}

main();
