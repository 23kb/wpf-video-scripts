const fs = require('fs');
const { OpenAI } = require('openai');
const cfg = require('./config');

const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY });

const html = fs.readFileSync('zoho-content.html', 'utf-8');
const imageDescriptions = JSON.parse(fs.readFileSync('zoho-image-descriptions.json', 'utf-8'));

const dynamicInstruction = `
We have ${imageDescriptions.length} screenshots, each with this description:
${imageDescriptions.map((d,i) => `${i+1}. "${d.description}"`).join('\n')}

Please produce:

1. An **intro** object with:
   • **narration** of exactly three sentences:
     1. A warm welcome (e.g. "Welcome, everyone! Today we're going to...").
     2. One sentence describing what this feature/tutorial is about. Determine this from the HTML of the doc. (e.g. "This powerful feature allows you to automatically send lead information from your forms directly to your Zoho account.").
     3. The exact sentence: "Before we begin, make sure you have WPForms installed and activated on your site"
   • **subtitle** of one clear sentence summarizing the tutorial topic.

2. Exactly ${imageDescriptions.length} **steps**. For each step:
   • **narration** that is one to two conversational sentences:
     – Start with a transition word (“First up,” “Next,” “Once done,” etc)  
     – Sentence 1 tells the user exactly what to do (e.g. "First up, go to your WPForms settings and click on the Integrations tab.").  
     – If you need a second sentence, begin with “Once there,” or “Then,” to describe what they see or the next click.
   • **subtitle** of one full sentence (6–15 words) that a user could follow on its own.

Output valid JSON in this format:
{
  "intro": {
    "narration": "...",
    "subtitle": "..."
  },
  "steps": [
    {
      "step": 1,
      "narration": "...",
      "screenshot": "step1.png",
      "subtitle": "..."
    },
    …
  ]
}
  HTML content:
"""${html}"""
`;

(async () => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: dynamicInstruction }],
      temperature: 0.5
    });

    const content = completion.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in model response');

    const json = JSON.parse(match[0]);
    fs.writeFileSync('narrationSteps.json', JSON.stringify(json, null, 2));
    console.log(`✅ Saved narrationSteps.json with ${json.steps?.length || 0} steps plus intro`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
