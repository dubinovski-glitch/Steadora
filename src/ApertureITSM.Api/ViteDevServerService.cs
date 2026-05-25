using System.Diagnostics;
using System.Net.Sockets;
using System.Runtime.InteropServices;

namespace ApertureITSM.Api;

/// <summary>
/// Starts the Vite dev server when the API launches and ensures every spawned
/// process (cmd.exe, npm, node/vite) is killed when debugging stops — even on
/// a hard kill from Visual Studio — via a Windows Job Object with KillOnJobClose.
/// </summary>
public class ViteDevServerService : BackgroundService
{
    private const int VitePort = 5173;
    private Process? _process;
    private IntPtr   _jobHandle = IntPtr.Zero;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var webDir = FindWebDirectory();
        if (webDir is null) return;

        // Create a Job Object so every child process is killed when this
        // process exits (handles are closed by the OS even on hard kills).
        _jobHandle = CreateJobObject(IntPtr.Zero, null);
        if (_jobHandle != IntPtr.Zero)
        {
            var info = new JobObjectExtendedLimitInformation();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            SetInformationJobObject(_jobHandle, JobObjectInfoType.ExtendedLimitInformation,
                ref info, Marshal.SizeOf(info));
        }

        _process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName         = "cmd.exe",
                Arguments        = "/c npm run dev",   // /c → window closes when npm exits
                WorkingDirectory = webDir,
                UseShellExecute  = true,
                CreateNoWindow   = false,
            }
        };

        _process.Start();

        // Assign the cmd.exe process (and its descendants) to the Job Object.
        if (_jobHandle != IntPtr.Zero)
            AssignProcessToJobObject(_jobHandle, _process.Handle);

        await WaitForPortAsync(VitePort, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        KillVite();
        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        KillVite();
        base.Dispose();
    }

    private void KillVite()
    {
        try { _process?.Kill(entireProcessTree: true); } catch { }
        _process?.Dispose();
        _process = null;

        if (_jobHandle != IntPtr.Zero)
        {
            CloseHandle(_jobHandle);   // triggers KillOnJobClose → kills any stragglers
            _jobHandle = IntPtr.Zero;
        }
    }

    private static async Task WaitForPortAsync(int port, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var tcp = new TcpClient();
                await tcp.ConnectAsync("127.0.0.1", port, ct);
                return;
            }
            catch
            {
                await Task.Delay(200, ct).ConfigureAwait(false);
            }
        }
    }

    private static string? FindWebDirectory()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "web");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "package.json")))
                return candidate;
            dir = dir.Parent;
        }
        return null;
    }

    // ── Windows Job Object P/Invoke ───────────────────────────────────────────

    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

    private enum JobObjectInfoType { ExtendedLimitInformation = 9 }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectBasicLimitInformation
    {
        public long  PerProcessUserTimeLimit;
        public long  PerJobUserTimeLimit;
        public uint  LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint  ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint  PriorityClass;
        public uint  SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount,  WriteTransferCount,  OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectExtendedLimitInformation
    {
        public JobObjectBasicLimitInformation BasicLimitInformation;
        public IoCounters                     IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, JobObjectInfoType infoType,
        ref JobObjectExtendedLimitInformation lpInfo, int cbInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);
}
