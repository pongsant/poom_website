"""Build lightweight homepage images with macOS sips; keep gallery originals intact."""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent.parent
sources = re.findall(r'src: "([^"]+)"', (root / 'photos.js').read_text())
for source in sources:
    output = root / 'previews' / source
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['sips', '-Z', '1600', '-s', 'format', 'jpeg', '-s',
                    'formatOptions', '72', str(root / source), '--out', str(output)],
                   check=True, stdout=subprocess.DEVNULL)
print(f'Built {len(sources)} homepage previews.')
