Sougetsu Akira FX 1.0.0
=======================

OPTION A - ZXP (signed, recommended)
 1. Close After Effects.
 2. Install SougetsuAkiraFX_1.0.0.zxp with a ZXP installer, e.g. aescripts ZXP Installer
    (free: aescripts.com/learn/zxp-installer) - drag the .zxp onto it.
    Or with Adobe's own tool (Windows, Command Prompt as administrator):
    "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "%USERPROFILE%\Downloads\SougetsuAkiraFX_1.0.0.zxp"
 3. Start After Effects > Window > Extensions (Legacy) > Sougetsu Akira FX.
 Use either A or B, not both (B removes copies installed by A).

OPTION B - folder install (also turns on debug mode for the self-test / DevTools)

INSTALL (Windows)
 1. Right-click the zip > Extract All.
 2. Close After Effects.
 3. Double-click INSTALL_WINDOWS.bat (click Yes when Windows asks for permission).
 4. Start After Effects > Window > Extensions (Legacy) > Sougetsu Akira FX
    (older versions: Window > Extensions > Sougetsu Akira FX).

INSTALL (Mac)
 Double-click INSTALL_MAC.command (if macOS blocks it: right-click > Open).

The folder com.sougetsu.akirafx itself is not a .zxp - use the .zxp file for option A.
The installer removes older copies of Sougetsu Akira FX (including ones a ZXP installer put in Program Files).

SELF-TEST
 After Effects > File > Scripts > Run Script File... > akira_selftest.jsx
 (first enable Edit > Preferences > Scripting & Expressions > "Allow Scripts to Write Files and Access Network").
 Send back Desktop\AkiraFX_selftest_report.txt
