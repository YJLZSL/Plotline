import re
from pathlib import Path

svgs_dir = Path('public/ai-logos')
out = Path('src/features/ai/providerIcons.tsx')

mapping = [
    ('openai', 'openai'),
    ('siliconflow', 'siliconcloud'),
    ('volcano', 'volcengine'),
    ('tencent', 'hunyuan'),
    ('deepseek', 'deepseek'),
    ('moonshot', 'moonshot'),
    ('zhipu', 'zhipu'),
    ('ollama', 'ollama'),
]

header = '''// Auto-generated from public/ai-logos/*.svg (LobeHub @lobehub/icons-static-svg)
// Do not edit manually; rerun `python scripts/generate-provider-icons.py` to refresh.

import type { SVGProps } from 'react';

interface BrandIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

function baseProps(className?: string): SVGProps<SVGSVGElement> {
  return {
    className,
    fill: 'currentColor',
    fillRule: 'evenodd',
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    role: 'img',
    'aria-hidden': true,
    width: 20,
    height: 20,
  } as SVGProps<SVGSVGElement>;
}
'''

parts = [header]

def to_camel_case(s: str) -> str:
    parts = s.split('-')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

for pid, slug in mapping:
    path = svgs_dir / f'{slug}.svg'
    with open(path, 'r', encoding='utf-8') as f:
        svg = f.read().strip()
    m = re.fullmatch(r'<svg[^>]*>(.*)</svg>', svg, re.S)
    inner = m.group(1) if m else svg
    inner = re.sub(r'<title>[^<]*</title>', f'<title>{pid}</title>', inner)
    # Convert kebab-case SVG attributes to React camelCase, but keep data-* / aria-* intact.
    inner = re.sub(
        r'(?<![\w-])(?!data-|aria-)([a-z]+(?:-[a-z]+)+)(?==)',
        lambda m: to_camel_case(m.group(1)),
        inner,
    )
    comp_name = pid[0].upper() + pid[1:] + 'Icon'
    parts.append(f'''
export function {comp_name}({{ className, ...rest }}: BrandIconProps) {{
  return (
    <svg {{...baseProps(className)}} {{...rest}}>
      {inner}
    </svg>
  );
}}
''')

parts.append('''
export function CustomIcon({ className, ...rest }: BrandIconProps) {
  return (
    <svg {...baseProps(className)} {...rest} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <title>custom</title>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
''')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(parts))
print('Generated', out.as_posix())
