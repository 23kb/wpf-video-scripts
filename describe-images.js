const fs = require('fs');
const { OpenAI } = require('openai');
const cfg = require('./config');

const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY });

const images = JSON.parse(fs.readFileSync('zoho-images.json', 'utf-8'));
const subset = images.slice(0, 20);

const visionPrompt = [
    {
      type: 'text',
      text: `You are a highly precise visual analyst specializing in WordPress user interfaces. Your task is to meticulously examine screenshots from WordPress plugin documentation and provide concise, action-oriented descriptions of the key UI elements and user interactions depicted.
  
  For each image, focus on:
  - Identifying specific WordPress UI components (e.g., dashboard menus, settings pages, form builders, buttons, checkboxes, text fields, dropdowns, tabs, links).
  - Describing the primary action or state shown (e.g., 
  
  
  clicking a button, filling a field, selecting an option, viewing a specific section).
  - Accurately transcribing any visible text, labels, or button names that are relevant to the action.
  
  Keep your descriptions instructional, concise (1-2 lines), and directly related to what is visible in the screenshot.
  
  Return a JSON array with the following structure:
  [
    {
      "image_url": "...",
      "description": "..."
    }
  ]`
  },
  ...subset.map(img => ({
    type: 'image_url',
    image_url: { url: img.image_url }
  }))
];

(async () => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: visionPrompt }],
      temperature: 0.4
    });

    const content = response.choices?.[0]?.message?.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in model response');

    const parsed = JSON.parse(match[0]);
    fs.writeFileSync('zoho-image-descriptions.json', JSON.stringify(parsed, null, 2));
    console.log(`✅ Saved ${parsed.length} image descriptions to zoho-image-descriptions.json`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
