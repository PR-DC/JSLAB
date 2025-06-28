Developer Command Prompt for VS
cd C:\Electron\JSLAB\lib\portable_server
cl /nologo /std:c++17 /O2 /MT /EHsc portable_server.cpp ws2_32.lib shell32.lib user32.lib