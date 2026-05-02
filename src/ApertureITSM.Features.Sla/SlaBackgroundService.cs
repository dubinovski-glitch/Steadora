using ApertureITSM.Core.Interfaces;
using log4net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ApertureITSM.Features.Sla;

public class SlaBackgroundService(IServiceScopeFactory scopeFactory) : BackgroundService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SlaBackgroundService));
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

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
