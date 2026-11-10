; JSLAB Windows installer configuration
; Author: Milos Petrasinovic <mpetrasinovic@pr-dc.com>
; PR-DC, Republic of Serbia
; info@pr-dc.com

!include "LogicLib.nsh"
!include "WinMessages.nsh"

!ifndef JSLAB_CLI_USER_KEY
  !define JSLAB_CLI_USER_KEY "Environment"
!endif
!ifndef JSLAB_CLI_MACHINE_KEY
  !define JSLAB_CLI_MACHINE_KEY "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
!endif
!ifndef JSLAB_CLI_MACHINE_ROOT
  !define JSLAB_CLI_MACHINE_ROOT HKLM
!endif
!ifndef JSLAB_CLI_MACHINE_HKEY
  !define JSLAB_CLI_MACHINE_HKEY 0x80000002
!endif

; Share the same PATH handling between the installer and uninstaller.
!macro JSLAB_CLI_PATH_FUNCTIONS PREFIX
Function ${PREFIX}JslabNormalizePath
  Exch $0
  Push $1
  StrCpy $1 $0 1
  ${If} $1 == '$\"'
    StrCpy $1 $0 1 -1
    ${If} $1 == '$\"'
      StrCpy $0 $0 -1
      StrCpy $0 $0 "" 1
    ${EndIf}
  ${EndIf}
  normalize_loop:
    StrCpy $1 $0 1 -1
    ${If} $1 == "\"
      StrCpy $0 $0 -1
      Goto normalize_loop
    ${EndIf}
  Pop $1
  Exch $0
FunctionEnd

; Accepts "add" or "remove" on the stack. Other PATH entries are preserved.
Function ${PREFIX}JslabUpdatePath
  Exch $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  StrCpy $1 ""
  StrCpy $R0 0x80000001
  StrCpy $R1 "${JSLAB_CLI_USER_KEY}"
  ${If} $installMode == "all"
    StrCpy $R0 ${JSLAB_CLI_MACHINE_HKEY}
    StrCpy $R1 "${JSLAB_CLI_MACHINE_KEY}"
  ${EndIf}

  ; Check the full registry value length before reading into an NSIS string.
  System::Call 'advapi32::RegOpenKeyExW(p R0, w R1, i 0, i 0x20019, *p .R2) i .R3'
  ${If} $R3 == 0
    System::Call 'advapi32::RegQueryValueExW(p R2, w "Path", p 0, p 0, p 0, *i .r9) i .R3'
    System::Call 'advapi32::RegCloseKey(p R2)'
    ${If} $R3 == 0
      IntOp $9 $9 / 2
      ${If} $9 >= ${NSIS_MAX_STRLEN}
        Goto path_error
      ${EndIf}
      ClearErrors
      ${If} $installMode == "all"
        ReadRegStr $1 ${JSLAB_CLI_MACHINE_ROOT} "${JSLAB_CLI_MACHINE_KEY}" "Path"
      ${Else}
        ReadRegStr $1 HKCU "${JSLAB_CLI_USER_KEY}" "Path"
      ${EndIf}
      IfErrors path_error
    ${ElseIf} $R3 != 2
      Goto path_error
    ${EndIf}
  ${ElseIf} $R3 != 2
    Goto path_error
  ${EndIf}

  Push $INSTDIR
  Call ${PREFIX}JslabNormalizePath
  Pop $7
  StrCpy $2 ""
  StrCpy $3 ""
  StrCpy $4 0
  StrCpy $6 0
  path_loop:
    StrCpy $5 $1 1 $4
    ${If} $5 == ";"
    ${OrIf} $5 == ""
      Push $3
      Call ${PREFIX}JslabNormalizePath
      Pop $8
      ${If} $8 != $7
        ${If} $6 == 0
          StrCpy $2 $3
        ${Else}
          StrCpy $2 "$2;$3"
        ${EndIf}
        IntOp $6 $6 + 1
      ${EndIf}
      StrCpy $3 ""
      ${If} $5 == ""
        Goto path_parsed
      ${EndIf}
    ${Else}
      StrCpy $3 "$3$5"
    ${EndIf}
    IntOp $4 $4 + 1
    Goto path_loop

  path_parsed:
    ${If} $0 == "add"
      ${If} $2 == ""
        StrCpy $2 $INSTDIR
      ${Else}
        ; Check the length before concatenation can truncate the result.
        StrLen $8 $2
        StrLen $9 $INSTDIR
        IntOp $9 $9 + $8
        IntOp $9 $9 + 1
        ${If} $9 >= ${NSIS_MAX_STRLEN}
          Goto path_error
        ${EndIf}
        StrCpy $2 "$2;$INSTDIR"
      ${EndIf}
    ${EndIf}
    ${If} $1 == $2
      Goto path_done
    ${EndIf}
    ClearErrors
    ${If} $installMode == "all"
      WriteRegExpandStr ${JSLAB_CLI_MACHINE_ROOT} "${JSLAB_CLI_MACHINE_KEY}" "Path" $2
    ${Else}
      WriteRegExpandStr HKCU "${JSLAB_CLI_USER_KEY}" "Path" $2
    ${EndIf}
    IfErrors path_error
    Goto path_done

  path_error:
    DetailPrint "JSLAB CLI: PATH could not be updated completely; the existing value was preserved."
  path_done:
    Pop $R3
    Pop $R2
    Pop $R1
    Pop $R0
    Pop $9
    Pop $8
    Pop $7
    Pop $6
    Pop $5
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Pop $0
FunctionEnd
!macroend

; Electron Builder declares installMode before expanding this hook.
!macro customHeader
  !ifdef BUILD_UNINSTALLER
    !insertmacro JSLAB_CLI_PATH_FUNCTIONS "un."
  !else
    !insertmacro JSLAB_CLI_PATH_FUNCTIONS ""
  !endif
!macroend

!macro customInstall
  Push "add"
  Call JslabUpdatePath
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro customUnInstall
  Push "remove"
  Call un.JslabUpdatePath
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend
