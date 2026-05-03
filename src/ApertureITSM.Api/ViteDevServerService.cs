using System.Diagnostics;

namespace ApertureITSM.Api;

public class ViteDevServerService : BackgroundService
{
    private Process? _process;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var webDir = FindWebDirectory();
        if (webDir is null) return Task.CompletedTask;

        _process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName               = "cmd.exe",
                Arguments              = "/k npm run dev",
                WorkingDirectory       = webDir,
                UseShellExecute        = true,
                CreateNoWindow         = false,
            }
        };

        _process.Start();

        stoppingToken.Register(() =>
        {
            try { _process?.Kill(entireProcessTree: true); } catch { }
        });

        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        try { _process?.Kill(entireProcessTree: true); } catch { }
        _process?.Dispose();
        base.Dispose();
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
