/**
 * Keyword Generation API
 *
 * POST: Generates 10 curriculum-relevant keywords for a given subject and grade level.
 * Falls back to hardcoded keywords when no AI model is available.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromHeaders } from '@/lib/server/resolve-model';

const log = createLogger('Generate Keywords');

type Language = 'zh-CN' | 'en-US';

interface KeywordsRequest {
  subject: string;
  grade: string;
  language: Language;
}

// ---------------------------------------------------------------------------
// Fallback keywords when AI model is not available
// ---------------------------------------------------------------------------

const FALLBACK_KEYWORDS: Record<Language, Record<string, string[]>> = {
  'zh-CN': {
    数学: ['函数', '方程', '几何', '概率', '统计', '代数', '微积分', '集合', '数列', '向量'],
    语文: ['阅读理解', '写作', '文言文', '修辞手法', '诗词鉴赏', '议论文', '记叙文', '散文', '小说', '成语'],
    英语: ['语法', '词汇', '阅读', '写作', '听力', '口语', '时态', '从句', '翻译', '作文'],
    物理: ['力学', '电磁学', '光学', '热学', '运动', '能量守恒', '电路', '波动', '原子物理', '万有引力'],
    化学: ['元素周期表', '化学反应', '酸碱盐', '有机化学', '氧化还原', '化学键', '溶液', '电化学', '化学平衡', '离子反应'],
    生物: ['细胞', '遗传', '进化', '生态系统', 'DNA', '光合作用', '呼吸作用', '神经系统', '免疫', '变异'],
    历史: ['朝代更替', '工业革命', '文艺复兴', '改革开放', '世界大战', '古代文明', '民主制度', '殖民扩张', '冷战', '全球化'],
    地理: ['气候', '地形', '人口', '资源', '环境保护', '板块构造', '水循环', '城市化', '农业', '工业'],
    _default: ['核心概念', '基础知识', '实践应用', '分析方法', '综合能力', '创新思维', '解题策略', '知识拓展', '学科素养', '跨学科融合'],
  },
  'en-US': {
    math: ['functions', 'equations', 'geometry', 'probability', 'statistics', 'algebra', 'calculus', 'sets', 'sequences', 'vectors'],
    mathematics: ['functions', 'equations', 'geometry', 'probability', 'statistics', 'algebra', 'calculus', 'sets', 'sequences', 'vectors'],
    english: ['grammar', 'vocabulary', 'reading comprehension', 'writing', 'literature', 'essay', 'poetry', 'rhetoric', 'critical analysis', 'composition'],
    science: ['scientific method', 'experiment', 'hypothesis', 'observation', 'energy', 'matter', 'cells', 'ecosystems', 'forces', 'chemical reactions'],
    physics: ['mechanics', 'electromagnetism', 'optics', 'thermodynamics', 'motion', 'energy conservation', 'circuits', 'waves', 'atomic physics', 'gravity'],
    chemistry: ['periodic table', 'chemical reactions', 'acids and bases', 'organic chemistry', 'oxidation-reduction', 'chemical bonds', 'solutions', 'electrochemistry', 'equilibrium', 'ionic reactions'],
    biology: ['cells', 'genetics', 'evolution', 'ecosystems', 'DNA', 'photosynthesis', 'respiration', 'nervous system', 'immunity', 'mutation'],
    history: ['civilizations', 'industrial revolution', 'renaissance', 'world wars', 'democracy', 'colonialism', 'cold war', 'globalization', 'ancient history', 'modern era'],
    geography: ['climate', 'landforms', 'population', 'resources', 'environment', 'plate tectonics', 'water cycle', 'urbanization', 'agriculture', 'industry'],
    _default: ['core concepts', 'fundamentals', 'practical application', 'analysis methods', 'critical thinking', 'problem solving', 'creative thinking', 'interdisciplinary', 'research skills', 'collaboration'],
  },
};

function getFallbackKeywords(subject: string, language: Language): string[] {
  const langMap = FALLBACK_KEYWORDS[language] || FALLBACK_KEYWORDS['en-US'];
  const key = subject.toLowerCase();
  return langMap[key] || langMap._default;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as KeywordsRequest;
    const { subject, grade, language } = body;

    if (!subject || !grade) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'subject and grade are required');
    }

    if (language && language !== 'zh-CN' && language !== 'en-US') {
      return apiError('INVALID_REQUEST', 400, 'language must be "zh-CN" or "en-US"');
    }

    const lang: Language = language || 'en-US';

    // Resolve model from request headers — may throw if no API key is configured
    let keywords: string[];

    try {
      const { model: languageModel } = resolveModelFromHeaders(req);

      const isZh = lang === 'zh-CN';

      const systemPrompt = isZh
        ? `你是一位资深课程设计专家。根据给定的学科和年级，生成10个与课程标准紧密相关的关键词。
必须以如下 JSON 格式回复（不要包含其他内容）：
{"keywords": ["关键词1", "关键词2", ..., "关键词10"]}`
        : `You are an expert curriculum designer. Generate 10 curriculum-relevant keywords for the given subject and grade level.
You must reply in the following JSON format only (no other content):
{"keywords": ["keyword1", "keyword2", ..., "keyword10"]}`;

      const userPrompt = isZh
        ? `学科：${subject}\n年级：${grade}\n请生成10个与该学科和年级课程标准紧密相关的关键词。`
        : `Subject: ${subject}\nGrade: ${grade}\nGenerate 10 curriculum-relevant keywords for this subject and grade level.`;

      const result = await callLLM(
        {
          model: languageModel,
          system: systemPrompt,
          prompt: userPrompt,
        },
        'generate-keywords',
      );

      // Parse the LLM response as JSON
      const text = result.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in LLM response');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
        throw new Error('Invalid keywords array in LLM response');
      }

      keywords = parsed.keywords.slice(0, 10).map(String);
    } catch (aiError) {
      // AI model not available or failed — use fallback keywords
      log.warn('AI generation failed, using fallback keywords:', aiError);
      keywords = getFallbackKeywords(subject, lang);
    }

    return apiSuccess({ keywords });
  } catch (error) {
    log.error('Error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to generate keywords');
  }
}
