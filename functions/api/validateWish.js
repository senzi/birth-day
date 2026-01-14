import OpenAI from "openai";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const origin = context.request.headers.get('Origin') || '';
  const deepseekApiKey = context.env.DEEPSEEK_API_KEY || '未设置DEEPSEEK_API_KEY环境变量';
  const deepseekApiBaseUrl = context.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';

  const allowedOrigins = [
    'https://birthday.closeai.moe',
    'http://127.0.0.1:8788',
    'http://localhost:8788',
    'http://localhost:5173'
  ];

  let isAllowedOrigin = false;
  if (!origin) {
    const referer = context.request.headers.get('Referer') || '';
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        isAllowedOrigin = allowedOrigins.includes(refererUrl.origin);
      } catch (e) {}
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') isAllowedOrigin = true;
  } else {
    isAllowedOrigin = allowedOrigins.includes(origin);
  }

  if (!isAllowedOrigin) return new Response('Forbidden', { status: 403 });

  const responseHeaders = new Headers({
    'Access-Control-Allow-Origin': origin || allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  });

  if (context.request.method === 'OPTIONS') return new Response(null, { headers: responseHeaders });

  try {
    const requestData = await context.request.json();
    const { name, type, date, hasYear, year, age } = requestData;

    const openai = new OpenAI({ baseURL: deepseekApiBaseUrl, apiKey: deepseekApiKey });

    const systemPrompt = `
### 角色：生日祝福文案专家

**任务：** 根据用户提供的个人信息，创作一段温柔、清爽、充满治愈感的生日祝福。

**输入信息：**
* 昵称：${name}
* 生日类型：${type === 'solar' ? '公历' : '农历'}
* 生日日期：${date}
* 是否有年份：${hasYear ? '是' : '否'}
${hasYear ? `* 出生年份：${year}\n* 当前年龄：${age}` : ''}

**输出要求：**
1. 风格：简洁、温柔、可爱。避免过度煽情或老掉牙的套话。
2. 色调匹配：文字内容应能唤起“浅蓝与粉色”的视觉感。
3. 必须输出纯 JSON 格式，且不包含任何 Markdown 代码块标签（如 \`\`\`json）。

**JSON 字段定义：**
* \`greeting\`: (string) 核心标题。字数 10 字以内。
* \`content\`: (string) 祝福正文。字数 30-60 字。
* \`short_wish\`: (string) 一句极简的短句。字数 15 字以内。
* \`vibe_tag\`: (string) 一个代表氛围的词，如“微风”、“晨曦”。
`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成祝福文案。" }
      ],
      model: "deepseek-chat",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return new Response(JSON.stringify({
      status: 'success',
      result: result
    }), { headers: responseHeaders });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ status: 'error', message: '因果律紊乱w' }), { status: 500, headers: responseHeaders });
  }
}
