/**
 * Extraction helper for medicospira questions.
 * Detects images, returns data for qwen2.5vl:3b vision analysis via Ollama.
 *
 * Call from Playwright browser context:
 *   const data = await page.evaluate(window.__extractWithVision);
 *
 * Returns: { question, choices, hasImages, imageSrcs, explanation, correct }
 *
 * After getting data, if hasImages:
 *   1. Download image from imageSrcs[0] via bash: `curl -sL '<src>' -o /tmp/question-img.jpg`
 *   2. Send to Ollama qwen2.5vl:3b with the question text:
 *      python3 -c "
 *      import base64, json, urllib.request
 *      with open('/tmp/question-img.jpg', 'rb') as f:
 *          b64 = base64.b64encode(f.read()).decode()
 *      payload = {
 *          'model': 'qwen2.5vl:3b',
 *          'messages': [{
 *              'role': 'user',
 *              'content': '<question text + choices>',
 *              'images': [b64]
 *          }],
 *          'stream': False,
 *          'options': {'max_tokens': 600}
 *      }
 *      req = urllib.request.Request('http://localhost:11434/api/chat', ...)
 *      resp = urllib.request.urlopen(req, timeout=60)
 *      print(json.loads(resp.read())['message']['content'])
 *      "
 *   3. Parse model output and pick correct answer
 */

window.__extractWithVision = function () {
  const panel = document.querySelector('[role="tabpanel"]') || document.body;

  // Extract question text
  const paras = Array.from(panel.querySelectorAll('p'))
    .map(p => p.innerText.trim())
    .filter(t => t.length > 10);

  // Extract choices
  const choices = Array.from(panel.querySelectorAll('input[type=radio]'))
    .map((r, idx) => {
      const sib = r.nextElementSibling;
      return sib ? { letter: String.fromCharCode(65 + idx), text: sib.innerText.trim() } : null;
    })
    .filter(c => c && c.text.length > 0);

  // Detect meaningful images (>100px, not icons)
  const imgs = Array.from(panel.querySelectorAll('img')).filter(img => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    return w > 100 || h > 100;
  });

  // Extract explanation
  const fullText = document.body.innerText;
  const expIdx = fullText.indexOf('Explanation\n');
  const explanation = expIdx >= 0
    ? fullText.slice(expIdx + 'Explanation\n'.length, expIdx + 3000).trim()
    : '';

  // Extract correct answer
  const correctIdx = fullText.indexOf('Correct Answer');
  const correct = correctIdx >= 0
    ? fullText.slice(correctIdx, correctIdx + 30).replace('Correct Answer ', '').split('\n')[0].trim()
    : '';

  return {
    question: paras.join('\n\n'),
    choices,
    hasImages: imgs.length > 0,
    imageCount: imgs.length,
    imageSrcs: imgs.map(i => i.src),
    explanation,
    correct,
  };
};

/**
 * After extraction, take screenshots of images in the question panel.
 * Must be called from Playwright context after __extractWithVision.
 */
window.__screenshotImages = async function () {
  const panel = document.querySelector('[role="tabpanel"]') || document.body;
  const imgs = Array.from(panel.querySelectorAll('img')).filter(img => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    return w > 100 || h > 100;
  });

  const screenshots = [];
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const rect = img.getBoundingClientRect();
    screenshots.push({
      idx: i,
      src: img.src,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }
  return screenshots;
};
