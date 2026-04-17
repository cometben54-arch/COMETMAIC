/**
 * LaTeX to speech text conversion.
 *
 * Converts LaTeX math expressions embedded in text into human-readable
 * pronunciation for TTS. Supports both Chinese and English output.
 *
 * Handles inline ($...$) and display ($$...$$) math delimiters.
 */

type Lang = 'zh-CN' | 'en-US';

// ── Symbol tables ────────────────────────────────────────────────────────────

const GREEK_ZH: Record<string, string> = {
  alpha: '阿尔法', beta: '贝塔', gamma: '伽马', delta: '德尔塔',
  epsilon: '艾普西龙', zeta: '泽塔', eta: '伊塔', theta: '西塔',
  iota: '约塔', kappa: '卡帕', lambda: '拉姆达', mu: '缪',
  nu: '纽', xi: '克西', pi: '派', rho: '罗',
  sigma: '西格马', tau: '陶', upsilon: '宇普西龙', phi: '斐',
  chi: '卡伊', psi: '普西', omega: '欧米伽',
  Alpha: '大写阿尔法', Beta: '大写贝塔', Gamma: '大写伽马', Delta: '大写德尔塔',
  Theta: '大写西塔', Lambda: '大写拉姆达', Pi: '大写派', Sigma: '大写西格马',
  Phi: '大写斐', Psi: '大写普西', Omega: '大写欧米伽',
  varepsilon: '变体艾普西龙', varphi: '变体斐', varpi: '变体派',
  varrho: '变体罗', varsigma: '变体西格马', vartheta: '变体西塔',
  infty: '无穷大', partial: '偏导', nabla: '梯度算子',
  hbar: '约化普朗克常数',
};

const GREEK_EN: Record<string, string> = {
  alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta',
  epsilon: 'epsilon', zeta: 'zeta', eta: 'eta', theta: 'theta',
  iota: 'iota', kappa: 'kappa', lambda: 'lambda', mu: 'mu',
  nu: 'nu', xi: 'xi', pi: 'pi', rho: 'rho',
  sigma: 'sigma', tau: 'tau', upsilon: 'upsilon', phi: 'phi',
  chi: 'chi', psi: 'psi', omega: 'omega',
  Alpha: 'Alpha', Beta: 'Beta', Gamma: 'Gamma', Delta: 'Delta',
  Theta: 'Theta', Lambda: 'Lambda', Pi: 'Pi', Sigma: 'Sigma',
  Phi: 'Phi', Psi: 'Psi', Omega: 'Omega',
  varepsilon: 'varepsilon', varphi: 'varphi', varpi: 'varpi',
  varrho: 'varrho', varsigma: 'varsigma', vartheta: 'vartheta',
  infty: 'infinity', partial: 'partial', nabla: 'nabla',
  hbar: 'h-bar',
};

const OPERATORS_ZH: Record<string, string> = {
  '+': '加', '-': '减', '=': '等于', '<': '小于', '>': '大于',
  '\\leq': '小于等于', '\\geq': '大于等于', '\\neq': '不等于',
  '\\approx': '约等于', '\\sim': '约', '\\equiv': '恒等于',
  '\\times': '乘以', '\\cdot': '点乘', '\\div': '除以',
  '\\pm': '正负', '\\mp': '负正',
  '\\in': '属于', '\\notin': '不属于', '\\subset': '包含于',
  '\\subseteq': '包含于等于', '\\cup': '并集', '\\cap': '交集',
  '\\forall': '对于所有', '\\exists': '存在',
  '\\rightarrow': '趋向', '\\leftarrow': '左箭头',
  '\\Rightarrow': '推出', '\\Leftrightarrow': '等价于',
  '\\to': '趋向于',
  '\\infty': '无穷大', '\\ldots': '省略号', '\\cdots': '省略号',
};

const OPERATORS_EN: Record<string, string> = {
  '+': 'plus', '-': 'minus', '=': 'equals', '<': 'less than', '>': 'greater than',
  '\\leq': 'less than or equal to', '\\geq': 'greater than or equal to',
  '\\neq': 'not equal to', '\\approx': 'approximately equal to',
  '\\sim': 'similar to', '\\equiv': 'equivalent to',
  '\\times': 'times', '\\cdot': 'dot', '\\div': 'divided by',
  '\\pm': 'plus or minus', '\\mp': 'minus or plus',
  '\\in': 'in', '\\notin': 'not in', '\\subset': 'subset of',
  '\\subseteq': 'subset of or equal to', '\\cup': 'union', '\\cap': 'intersection',
  '\\forall': 'for all', '\\exists': 'there exists',
  '\\rightarrow': 'approaches', '\\leftarrow': 'left arrow',
  '\\Rightarrow': 'implies', '\\Leftrightarrow': 'if and only if',
  '\\to': 'approaches', '\\infty': 'infinity',
  '\\ldots': 'dot dot dot', '\\cdots': 'dot dot dot',
};

// Chemical element symbols to names
const CHEM_ELEMENTS: Record<string, string> = {
  H: '氢', He: '氦', Li: '锂', Be: '铍', B: '硼', C: '碳', N: '氮',
  O: '氧', F: '氟', Ne: '氖', Na: '钠', Mg: '镁', Al: '铝', Si: '硅',
  P: '磷', S: '硫', Cl: '氯', Ar: '氩', K: '钾', Ca: '钙', Fe: '铁',
  Cu: '铜', Zn: '锌', Ag: '银', Au: '金', Hg: '汞', Pb: '铅', I: '碘',
  Mn: '锰', Cr: '铬', Ni: '镍', Ba: '钡', Br: '溴',
};

const CHEM_ELEMENTS_EN: Record<string, string> = {
  H: 'hydrogen', He: 'helium', Li: 'lithium', Be: 'beryllium', B: 'boron',
  C: 'carbon', N: 'nitrogen', O: 'oxygen', F: 'fluorine', Ne: 'neon',
  Na: 'sodium', Mg: 'magnesium', Al: 'aluminum', Si: 'silicon', P: 'phosphorus',
  S: 'sulfur', Cl: 'chlorine', Ar: 'argon', K: 'potassium', Ca: 'calcium',
  Fe: 'iron', Cu: 'copper', Zn: 'zinc', Ag: 'silver', Au: 'gold',
  Hg: 'mercury', Pb: 'lead', I: 'iodine', Mn: 'manganese', Cr: 'chromium',
  Ni: 'nickel', Ba: 'barium', Br: 'bromine',
};

// ── Core LaTeX parser ────────────────────────────────────────────────────────

/**
 * Parse a single LaTeX expression and convert to spoken text.
 */
export function latexToSpeech(latex: string, lang: Lang = 'zh-CN'): string {
  const isZh = lang === 'zh-CN';
  const greek = isZh ? GREEK_ZH : GREEK_EN;
  const ops = isZh ? OPERATORS_ZH : OPERATORS_EN;

  let s = latex.trim();

  // ── Fractions: \frac{a}{b} ──
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
    const n = latexToSpeech(num, lang);
    const d = latexToSpeech(den, lang);
    if (isZh) return `${d}分之${n}`;
    return `${n} over ${d}`;
  });

  // ── Square root: \sqrt{x} ──
  s = s.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}/g, (_, idx, expr) => {
    const e = latexToSpeech(expr, lang);
    if (idx) {
      const i = latexToSpeech(idx, lang);
      return isZh ? `${i}次方根号${e}` : `${i}th root of ${e}`;
    }
    return isZh ? `根号${e}` : `square root of ${e}`;
  });

  // ── Superscript: x^{n} or x^n ──
  s = s.replace(/\^(?:\{([^}]+)\}|([^{}\s]))/g, (_, inner, single) => {
    const exp = latexToSpeech(inner ?? single, lang);
    if (exp === '2') return isZh ? '的平方' : ' squared';
    if (exp === '3') return isZh ? '的立方' : ' cubed';
    return isZh ? `的${exp}次方` : ` to the power of ${exp}`;
  });

  // ── Subscript: x_{n} or x_n ──
  s = s.replace(/_(?:\{([^}]+)\}|([^{}\s]))/g, (_, inner, single) => {
    const sub = latexToSpeech(inner ?? single, lang);
    return isZh ? `下标${sub}` : ` subscript ${sub}`;
  });

  // ── Integrals ──
  s = s.replace(/\\int(?:_\{([^}]*)\})?\^?\{?([^}]*)\}?/g, (_, lower, upper) => {
    if (lower && upper) {
      return isZh
        ? `从${latexToSpeech(lower, lang)}到${latexToSpeech(upper, lang)}的积分`
        : `integral from ${latexToSpeech(lower, lang)} to ${latexToSpeech(upper, lang)}`;
    }
    return isZh ? '积分' : 'integral';
  });

  // ── Summation ──
  s = s.replace(/\\sum(?:_\{([^}]*)\})?(?:\^\{([^}]*)\})?/g, (_, lower, upper) => {
    if (lower && upper) {
      return isZh
        ? `从${latexToSpeech(lower, lang)}到${latexToSpeech(upper, lang)}的求和`
        : `sum from ${latexToSpeech(lower, lang)} to ${latexToSpeech(upper, lang)}`;
    }
    return isZh ? '求和' : 'sum';
  });

  // ── Product ──
  s = s.replace(/\\prod/g, isZh ? '乘积' : 'product');

  // ── Limit ──
  s = s.replace(/\\lim(?:_\{([^}]*)\})?/g, (_, sub) => {
    if (sub) {
      return isZh
        ? `当${latexToSpeech(sub, lang)}时的极限`
        : `limit as ${latexToSpeech(sub, lang)}`;
    }
    return isZh ? '极限' : 'limit';
  });

  // ── Logarithms and trig ──
  const funcMap: Record<string, [string, string]> = {
    '\\log': ['对数', 'log'],
    '\\ln': ['自然对数', 'natural log'],
    '\\lg': ['常用对数', 'log base 10'],
    '\\sin': ['正弦', 'sine'],
    '\\cos': ['余弦', 'cosine'],
    '\\tan': ['正切', 'tangent'],
    '\\cot': ['余切', 'cotangent'],
    '\\sec': ['正割', 'secant'],
    '\\csc': ['余割', 'cosecant'],
    '\\arcsin': ['反正弦', 'arcsine'],
    '\\arccos': ['反余弦', 'arccosine'],
    '\\arctan': ['反正切', 'arctangent'],
    '\\exp': ['指数函数', 'exponential'],
    '\\max': ['最大值', 'maximum'],
    '\\min': ['最小值', 'minimum'],
    '\\det': ['行列式', 'determinant'],
    '\\dim': ['维数', 'dimension'],
    '\\ker': ['核', 'kernel'],
    '\\mod': ['模', 'mod'],
  };
  for (const [cmd, [zh, en]] of Object.entries(funcMap)) {
    s = s.replace(new RegExp(cmd.replace('\\', '\\\\'), 'g'), isZh ? zh : en);
  }

  // ── Greek letters ──
  for (const [name, spoken] of Object.entries(greek)) {
    s = s.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), spoken);
  }

  // ── Operators ──
  for (const [sym, spoken] of Object.entries(ops)) {
    const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(escaped, 'g'), ` ${spoken} `);
  }

  // ── Matrices: \begin{matrix}...\end{matrix} ──
  s = s.replace(/\\begin\{[a-z]*matrix\}([\s\S]*?)\\end\{[a-z]*matrix\}/g, (_, content) => {
    return isZh ? `矩阵：${content.replace(/\\\\/g, '，').replace(/&/g, ' ')}` : `matrix: ${content.replace(/\\\\/g, ', ').replace(/&/g, ' ')}`;
  });

  // ── Chemical formulas: handle subscripts like H_2O, CO_2 ──
  // Convert element symbols to names in chemical context
  if (/[A-Z][a-z]?_?\d/.test(s) && !/\\/.test(s)) {
    s = convertChemFormula(s, lang);
  }

  // ── Clean up remaining LaTeX commands ──
  s = s.replace(/\\[a-zA-Z]+/g, ' ');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Convert a simple chemical formula string to spoken text.
 * E.g. "H2O" → "H2O" (kept as is for TTS; TTS reads it naturally)
 * E.g. "H_2O" → "氢2氧" in zh-CN
 */
function convertChemFormula(formula: string, lang: Lang): string {
  const isZh = lang === 'zh-CN';
  const elements = isZh ? CHEM_ELEMENTS : CHEM_ELEMENTS_EN;

  // Replace element symbols with names only for zh-CN
  if (isZh) {
    return formula.replace(/([A-Z][a-z]?)(_?\d*)/g, (_, el, num) => {
      const name = elements[el] || el;
      const n = num.replace('_', '');
      return n ? `${name}${n}` : name;
    });
  }
  // For English, just remove LaTeX subscript syntax
  return formula.replace(/_\{?(\d+)\}?/g, '$1');
}

// ── Main exported function ───────────────────────────────────────────────────

/**
 * Process a full text string, converting all embedded LaTeX math
 * expressions ($...$ and $$...$$) to spoken form for TTS.
 */
export function processTextForTTS(text: string, lang: Lang = 'zh-CN'): string {
  if (!text) return text;

  // First handle display math $$...$$
  let result = text.replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
    return ` ${latexToSpeech(latex, lang)} `;
  });

  // Then handle inline math $...$
  result = result.replace(/\$([^$\n]+)\$/g, (_, latex) => {
    return latexToSpeech(latex, lang);
  });

  // Handle \(...\) inline math
  result = result.replace(/\\\(([^)]+)\\\)/g, (_, latex) => {
    return latexToSpeech(latex, lang);
  });

  // Handle \[...\] display math
  result = result.replace(/\\\[([^\]]+)\\\]/g, (_, latex) => {
    return ` ${latexToSpeech(latex, lang)} `;
  });

  return result;
}

/**
 * Check whether a text string contains LaTeX math expressions.
 */
export function containsLatex(text: string): boolean {
  return /\$[^$]+\$|\\\(|\\\[|\\frac|\\sqrt|\\int|\\sum/.test(text);
}
