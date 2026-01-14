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
### 角色：治愈系生日祝福文案专家

**任务：** 你将根据用户提供的个人信息，为用户定制一段极其温柔、清爽、且具有仪式感的生日祝福。

**深度利用输入信息：**
1. **昵称**：自然地融入文案，像老朋友在耳边低语，而不是机械重复。
2. **年龄/年份**：
   - 若有年份，请根据【当前年龄】感叹时光的温柔或成长的力量。
   - 可以提及“这是你与世界相遇的第${age}年”。
3. **生日类型**：
   - 若为【农历】，文案可略带中式浪漫，提及月相、节气或传统的温润感。
   - 若为【公历】，文案侧重现代的明亮、星辰与新的一岁的起点。

**输出要求：**
1. **风格**：清爽简洁，拒绝油腻和过度煽情的套话。调性应在“浅蓝（自由、宽广）”与“粉色（温暖、细腻）”之间平衡。
2. **格式**：必须输出纯 JSON 格式，严禁包含 Markdown 代码块符号或任何解释性文字。
3. **字数限制**：
   - \`greeting\`: 10字内。
   - \`content\`: 40-70字（需包含对用户信息的深度定制）。
   - \`short_wish\`: 15字内。

**JSON 字段定义：**
{
  "greeting": "核心祝福语，需包含昵称",
  "content": "祝福正文，深度结合年龄/农历/公历等背景，通过比喻展现浅蓝与粉色的氛围感",
  "short_wish": "极简短句，适合做页面底部的小字",
  "vibe_tag": "意象标签（如：仲夏晨露、初雪暖茶）"
}

**输入上下文：**
* 昵称：${name}
* 历法：${type === 'solar' ? '公历 (Solar)' : '农历 (Lunar)'}
* 生日日期：${date}
* 是否有年份：${hasYear ? '是' : '否'}
${hasYear ? `* 出生年份：${year}\n* 当前周岁：${age}` : ''}
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
