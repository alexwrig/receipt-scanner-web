import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `You are a receipt data extractor. Analyze this receipt image and return ONLY a valid JSON object with exactly these keys:

{
  "date": "M/D/YYYY format (e.g. 1/4/2026)",
  "merchant": "store or restaurant name",
  "amount": "total amount as a number (e.g. 12.50)",
  "category": "infer from merchant type — use one of: Housing & food, Transportation, Shopping, Health, Entertainment, Travel, Other",
  "purpose": "short label like Food, Gas, Groceries, Shopping, Coffee, etc.",
  "card": "last 4 digits of card as a number if visible, otherwise empty string",
  "receipt_source": "how this receipt was obtained — one of: App, Email, Photo, Web"
}

Rules:
- For category: restaurants/cafes/food → "Housing & food", gas stations → "Transportation", retail/clothing → "Shopping", pharmacies/medical → "Health", streaming/games → "Entertainment", hotels/flights → "Travel", anything else → "Other"
- For receipt_source: default to "Photo" unless the image clearly shows an email or app screenshot
- If a field is not visible or cannot be determined, use empty string ""
- Return ONLY the JSON object, no markdown, no explanation`;

export async function extractReceiptData(base64Image, mediaType) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const fileContent = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Image } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType,          data: base64Image } };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [fileContent, { type: 'text', text: PROMPT }],
      },
    ],
  });

  const text = response.content[0].text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(text);
}
