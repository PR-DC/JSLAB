# JSLAB Windows LaTeX compiler process
# Milos Petrasinovic <mpetrasinovic@pr-dc.com>
# PR-DC, Republic of Serbia
# info@pr-dc.com

# Runs the compiler in a kill-on-close Windows job. Git Perl's shell may
# otherwise outlive latexmk and hold its output pipes open after cancellation.
param([Parameter(Mandatory = $true)][string]$Request)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class JslabLatexJob {
  [StructLayout(LayoutKind.Sequential)]
  private struct BasicLimits {
    public long PerProcessUserTime, PerJobUserTime;
    public uint Flags;
    public UIntPtr MinimumWorkingSet, MaximumWorkingSet;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass, SchedulingClass;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct ExtendedLimits {
    public BasicLimits Basic;
    public ulong ReadOperations, WriteOperations, OtherOperations;
    public ulong ReadBytes, WriteBytes, OtherBytes;
    public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
  }

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern IntPtr CreateJobObject(IntPtr attributes, IntPtr name);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref ExtendedLimits limits, int length);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll")]
  private static extern IntPtr GetCurrentProcess();

  public static void Attach() {
    // Windows closes this non-inheritable handle when the PowerShell host exits.
    IntPtr job = CreateJobObject(IntPtr.Zero, IntPtr.Zero);
    if (job == IntPtr.Zero) throw new Win32Exception();
    var limits = new ExtendedLimits();
    limits.Basic.Flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if (!SetInformationJobObject(job, 9, ref limits, Marshal.SizeOf(limits)))
      throw new Win32Exception();
    if (!AssignProcessToJobObject(job, GetCurrentProcess()))
      throw new Win32Exception();
  }
}
'@

[JslabLatexJob]::Attach()
$build = Get-Content -LiteralPath $Request -Raw -Encoding UTF8 | ConvertFrom-Json
$compilerArgs = @($build.args)
& $build.executable @compilerArgs
exit $LASTEXITCODE
