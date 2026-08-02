using ApertureITSM.Core.Interfaces;
using log4net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ApertureITSM.Features.Sla;

/// <summary>
/// Hosted background worker that periodically evaluates SLA timers for breaches.
/// Runs for the lifetime of the application, waking on a fixed interval to recompute
/// which records have breached or are at risk of breaching their SLA targets.
/// </summary>
public class SlaBackgroundService(IServiceScopeFactory scopeFactory) : BackgroundService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SlaBackgroundService));
    // How often the breach-evaluation cycle runs.
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Main loop: every <see cref="Interval"/> (1 minute), opens a fresh DI scope, resolves
    /// a scoped <see cref="ISlaRepository"/>, and runs breach evaluation. Business rules:
    /// a new scope is created per cycle so the scoped repository/DB context is not shared
    /// across iterations; any exception in a cycle is logged and swallowed so a single
    /// failure does not stop the service; the loop exits cleanly on cancellation.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        log.Info("SLA evaluation background service started");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<ISlaRepository>();
                await repo.EvaluateBreachesAsync();
            }
            catch (Exception ex)
            {
                log.Error("SLA evaluation cycle failed", ex);
            }
            await Task.Delay(Interval, stoppingToken);
        }
        log.Info("SLA evaluation background service stopped");
    }
}
