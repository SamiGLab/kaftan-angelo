import { transform } from 'lightningcss';

// Astro bundles CSS for statically imported components even on routes where
// those components are not rendered. A scoped selector cannot match without
// its generated attribute; keep global rules and every scope in the HTML.
export function pruneScopedStyles(html) {
  const markup = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const scopes = new Set(markup.match(/\bdata-astro-cid-[a-z0-9]+\b/g) ?? []);
  return html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (tag, open, css, close) => {
    if (!css.includes('data-astro-cid-')) return tag;
    const result = transform({
      filename: 'route-styles.css', code: Buffer.from(css), minify: true,
      visitor: {
        Rule: {
          style(rule) {
            const unused = rule.value.selectors.every(selector => selector.some(part =>
              part.type === 'attribute' && part.name.startsWith('data-astro-cid-') && !scopes.has(part.name)
            ));
            if (unused) return [];
          },
        },
      },
    });
    return open + result.code.toString() + close;
  });
}
