import os
import plistlib
from pathlib import Path

path = Path('ios/App/App/Info.plist')
with path.open('rb') as stream:
    info = plistlib.load(stream)
info['CFBundleDisplayName'] = 'VerioDetect'
info['CFBundleShortVersionString'] = '0.7.6'
info['CFBundleVersion'] = str(int(os.environ.get('BUILD_NUMBER_BASE', '100')) + int(os.environ.get('PROJECT_BUILD_NUMBER', '1')))
# The inspected app uses OS HTTPS only; no custom cryptography.
info['ITSAppUsesNonExemptEncryption'] = False
with path.open('wb') as stream:
    plistlib.dump(info, stream)
print('VerioDetect', info['CFBundleShortVersionString'], 'build', info['CFBundleVersion'])
