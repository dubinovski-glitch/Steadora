using System.Diagnostics;
using System.Net.Sockets;

namespace ApertureITSM.Api;

public class ViteDevServerService : BackgroundService
{
    private const int VitePort = 5173;
    private Process? _process;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var webDir = FindWebDirectory();
        if (webDir is null) return;

        _process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName         = "cmd.exe",
                Arguments        = "/k npm run dev",
                WorkingDirectory = webDir,
                UseShellExecute  = true,
                CreateNoWindow   = false,
            }
        };

        _process.Start();

        stoppingToken.Register(() =>
        {
            try { _process?.Kill(entireProcessTree: true); } catch { }
        });

        await WaitForPortAsync(VitePort, stoppingToken);
    }

    public override void Dispose()
    {
        try { _process?.Kill(entireProcessTree: true); } catch { }
        _process?.Dispose();
        base.Dispose();
    }

    // Polls TCP port until Vite is accepting connections, then returns so the
    // browser launch (triggered by launchSettings.json) lands on a ready server.
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
}
