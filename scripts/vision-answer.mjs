/**
 * Vision extraction helper for medicospira.
 *
 * Workflow (run during exam loop):
 *   1. Inject extract-vision.mjs into page
 *   2. Call __extractWithVision → get question text, choices, hasImages
 *   3. If hasImages:
 *      a. Use playwright_browser_take_screenshot to capture the image element
 *      b. I (mimo-v2-5-pro) analyze the screenshot directly via Read tool
 *      c. I return my answer letter based on image + question
 *   4. If no images: use text-based answer extraction as before
 *
 * No external API needed. I am the vision model.
 */
