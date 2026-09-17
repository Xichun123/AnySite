export function stripCodeFence(code) {
  const source = String(code || '').trim();
  const fenced = source.match(/^```\s*(?:javascript|js|css)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  return fenced ? fenced[1].trim() : source;
}

export function detectCodeType(code) {
  const raw = String(code || '').trim();
  if (/^```\s*css\b/i.test(raw)) return 'CSS';
  if (/^```\s*(?:javascript|js)\b/i.test(raw)) return 'JS';

  const source = stripCodeFence(raw);
  if (!source) return 'CSS';

  const javascriptSyntax = [
    /(?:^|[;{}\n])\s*(?:const|let|var|function|class|if|for|while|switch|try|throw|return|import|export)\b/,
    /(?:^|[^\w$])(?:document|window|globalThis|console|location|navigator)\s*[.[]/,
    /(?:^|[^\w$])(?:alert|confirm|prompt|setTimeout|setInterval|requestAnimationFrame)\s*\(/,
    /(?:^|[^\w$])(?:MutationObserver|IntersectionObserver|ResizeObserver)\s*\(/,
    /(?:^|[^=])=>/,
    /^\s*[!(]?\s*(?:async\s+)?function\b/,
  ];
  if (javascriptSyntax.some((pattern) => pattern.test(source))) return 'JS';

  const cssRule = /(?:^|})\s*(?:@[-\w][^{;]*|[^{};]+)\s*\{[^{}]*(?:--[-\w]+|[-a-zA-Z][\w-]*)\s*:/s;
  return cssRule.test(source) ? 'CSS' : 'JS';
}
