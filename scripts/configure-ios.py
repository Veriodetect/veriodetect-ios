import os
import json
import plistlib
from pathlib import Path

path = Path('ios/App/App/Info.plist')
with path.open('rb') as stream:
    info = plistlib.load(stream)
channel = os.environ.get('APP_CHANNEL', 'staging')
if channel not in ('staging', 'release'):
    raise ValueError('APP_CHANNEL must be staging or release')
info['CFBundleDisplayName'] = 'VerioDetect' if channel == 'release' else 'VerioDetect Staging'
info['CFBundleShortVersionString'] = json.loads(Path('package.json').read_text())['version']
info['CFBundleVersion'] = str(int(os.environ.get('BUILD_NUMBER_BASE', '100')) + int(os.environ.get('PROJECT_BUILD_NUMBER', '1')))
# The inspected app uses OS HTTPS only; no custom cryptography.
info['ITSAppUsesNonExemptEncryption'] = False
with path.open('wb') as stream:
    plistlib.dump(info, stream)
print('VerioDetect', info['CFBundleShortVersionString'], 'build', info['CFBundleVersion'])
