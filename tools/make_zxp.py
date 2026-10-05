#!/usr/bin/env python3
"""Build a signed .zxp from the assembled CEP folder (dist/com.sougetsu.akirafx), without Adobe's ZXPSignCmd.

Writes the same META-INF/signatures.xml that ZXPSignCmd writes (XML-DSig: a Manifest with a SHA-256 digest per file,
RSA-SHA1 over the exclusive-C14N SignedInfo, self-signed X.509 certificate). Self-signed ZXPs install with Adobe's
UPIA / ExManCmd and with ZXP installers such as aescripts ZXP Installer.

The signing key + certificate live in tools/.signing/ (git-ignored) and are created on first run. Keep that folder:
signing future versions with the same certificate keeps updates smooth.

usage: python3 tools/make_zxp.py [SRC_DIR] [OUT.zxp]       (needs: pip install cryptography)
"""
import base64, datetime, hashlib, os, sys, urllib.parse, zipfile
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'com.sougetsu.akirafx'))
OUT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'dist', 'SougetsuAkiraFX.zxp'))
SIGN_DIR = os.path.join(ROOT, 'tools', '.signing')
DSIG = 'http://www.w3.org/2000/09/xmldsig#'
C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256'
MIMETYPE = b'application/vnd.adobe.air-ucf-package+zip'
SKIP = {'.DS_Store', 'Thumbs.db', '.debug'}


def key_and_cert():
    os.makedirs(SIGN_DIR, exist_ok=True)
    kp, cp = os.path.join(SIGN_DIR, 'akira_sign_key.pem'), os.path.join(SIGN_DIR, 'akira_sign_cert.pem')
    if os.path.exists(kp) and os.path.exists(cp):
        key = serialization.load_pem_private_key(open(kp, 'rb').read(), None)
        return key, x509.load_pem_x509_certificate(open(cp, 'rb').read())
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME, 'KZ'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Sougetsu'),
                      x509.NameAttribute(NameOID.COMMON_NAME, 'Sougetsu Akira FX')])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=365 * 25)).sign(key, hashes.SHA256()))
    open(kp, 'wb').write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    open(cp, 'wb').write(cert.public_bytes(serialization.Encoding.PEM))
    try: os.chmod(kp, 0o600)
    except OSError: pass
    return key, cert


def b64(b): return base64.b64encode(b).decode('ascii')
def lines(s, n=64): return '\n'.join(s[i:i + n] for i in range(0, len(s), n))
def uri(p): return urllib.parse.quote(p, safe='/').replace('%5B', '%5b').replace('%5D', '%5d')


def main():
    if not os.path.isfile(os.path.join(SRC, 'CSXS', 'manifest.xml')):
        sys.exit('Not a CEP folder (no CSXS/manifest.xml): ' + SRC + '\nRun tools/build_cep.sh first.')
    files = []
    for root, dirs, fs in os.walk(SRC):
        dirs[:] = sorted(d for d in dirs if d not in ('META-INF', '__pycache__', '.git'))
        for f in sorted(fs):
            if f in SKIP or f.endswith('.pyc'):
                continue
            full = os.path.join(root, f)
            files.append((os.path.relpath(full, SRC).replace(os.sep, '/'), full))
    # Manifest written directly in canonical form (expanded empty elements, no whitespace inside), so its exclusive
    # C14N is exactly this text with the default namespace declared on <Manifest>.
    refs = ['<Reference URI="mimetype"><DigestMethod Algorithm="%s"></DigestMethod><DigestValue>%s</DigestValue></Reference>' % (SHA256, b64(hashlib.sha256(MIMETYPE).digest()))]
    for rel, full in files:
        refs.append('<Reference URI="%s"><DigestMethod Algorithm="%s"></DigestMethod><DigestValue>%s</DigestValue></Reference>' % (uri(rel), SHA256, b64(hashlib.sha256(open(full, 'rb').read()).digest())))
    manifest_body = '\n' + ''.join(refs)
    manifest_c14n = '<Manifest xmlns="%s" Id="PackageContents">%s</Manifest>' % (DSIG, manifest_body)
    signed_body = ('\n<CanonicalizationMethod Algorithm="%s"></CanonicalizationMethod>\n<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>\n'
                   '<Reference Type="http://www.w3.org/2000/09/xmldsig#Manifest" URI="#PackageContents">\n<Transforms>\n<Transform Algorithm="%s"></Transform>\n</Transforms>\n'
                   '<DigestMethod Algorithm="%s"></DigestMethod>\n<DigestValue>%s</DigestValue>\n</Reference>\n') % (C14N, C14N, SHA256, b64(hashlib.sha256(manifest_c14n.encode('utf-8')).digest()))
    signed_c14n = '<SignedInfo xmlns="%s">%s</SignedInfo>' % (DSIG, signed_body)
    key, cert = key_and_cert()
    sigval = key.sign(signed_c14n.encode('utf-8'), padding.PKCS1v15(), hashes.SHA1())
    xml = ('<signatures>\n<Signature xmlns="%s" Id="PackageSignature">\n<SignedInfo>%s</SignedInfo>\n<SignatureValue Id="PackageSignatureValue">%s</SignatureValue>\n\n'
           '<KeyInfo>\n<X509Data>\n<X509Certificate>%s\n</X509Certificate>\n</X509Data>\n</KeyInfo>\n<Object>\n<Manifest Id="PackageContents">%s</Manifest>\n</Object>\n</Signature>\n</signatures>\n') % (
        DSIG, signed_body, lines(b64(sigval)), lines(b64(cert.public_bytes(serialization.Encoding.DER))), manifest_body)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr(zipfile.ZipInfo('mimetype'), MIMETYPE, compress_type=zipfile.ZIP_STORED)
        for rel, full in files:
            z.write(full, rel)
        z.writestr('META-INF/signatures.xml', xml.encode('utf-8'))
    os.replace(tmp, OUT)
    print('Signed %d files -> %s (%.1f MB), certificate: %s' % (len(files), OUT, os.path.getsize(OUT) / 1048576, cert.subject.rfc4514_string()))


if __name__ == '__main__':
    main()
