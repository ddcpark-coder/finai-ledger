; FinAI e-integrator DESKTOP-01: unsigned offline QA installer.
; Never publish this as a production accounting release.
#define AppName "e-integrator Desktop (preizkus)"
#define AppVersion "0.1.0"
#define AppExe "EIntegrator.Desktop.exe"

[Setup]
AppId={{B4A282F1-1BDE-446A-85CA-75E8BE0988B4}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=FinAI
DefaultDirName={localappdata}\Programs\e-integrator-desktop
DefaultGroupName=e-integrator
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#AppExe}
OutputDir=..\..\dist\installer
OutputBaseFilename=e-integrator-desktop-offline-setup-win-x64-unsigned
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes

[Tasks]
Name: "desktopicon"; Description: "Ustvari bližnjico na namizju"; GroupDescription: "Dodatne možnosti:"; Flags: unchecked

[Files]
Source: "..\..\dist\windows\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\buildtools\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{autoprograms}\e-integrator"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\e-integrator"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{tmp}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; Parameters: "/silent /install"; Flags: runhidden waituntilterminated; Check: NeedsWebView2
Filename: "{app}\{#AppExe}"; Description: "Zaženi e-integrator (preizkus)"; Flags: nowait postinstall skipifsilent

[Code]
function NeedsWebView2(): Boolean;
var
  Version: String;
  UserInstalled, MachineInstalled: Boolean;
begin
  UserInstalled := RegQueryStringValue(HKCU,
    'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
  MachineInstalled := RegQueryStringValue(HKLM,
    'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
  Result := not (UserInstalled or MachineInstalled);
end;
