using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Changes;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.KnowledgeBase;
using ApertureITSM.Features.Notifications;
using ApertureITSM.Features.Sla;
using ApertureITSM.Features.Problems;
using ApertureITSM.Infrastructure.Database;
using ApertureITSM.Infrastructure.Repositories;
using ApertureITSM.Api;
using ApertureITSM.Api.Hubs;
using log4net;
using log4net.Config;
using System.Reflection;

// Bootstrap log4net
var logRepo = LogManager.GetRepository(Assembly.GetEntryAssembly()!);
XmlConfigurator.Configure(logRepo, new FileInfo("log4net.config"));
var startupLog = LogManager.GetLogger(typeof(Program));

Directory.CreateDirectory("logs");

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var features = config.GetSection("Features");

startupLog.Info("ApertureITSM API starting up");

var connStr = config.GetConnectionString("ApertureITSM")
    ?? throw new InvalidOperationException("Connection string 'ApertureITSM' is not configured.");

// Infrastructure
builder.Services.AddSingleton<IDbConnectionFactory>(_ => new SqlConnectionFactory(connStr));
builder.Services.AddScoped<IIncidentRepository, IncidentRepository>();
builder.Services.AddScoped<IProblemRepository, ProblemRepository>();
builder.Services.AddScoped<IChangeRepository, ChangeRepository>();
builder.Services.AddScoped<IKbRepository, KbRepository>();
builder.Services.AddScoped<IActivityRepository, ActivityRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ILookupRepository, LookupRepository>();
builder.Services.AddScoped<ISlaRepository, SlaRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();

// Feature: Incidents
if (features.GetValue<bool>("Incidents"))
    builder.Services.AddScoped<IIncidentService, IncidentService>();

// Feature: Problems
if (features.GetValue<bool>("Problems"))
    builder.Services.AddScoped<IProblemService, ProblemService>();

// Feature: Changes
if (features.GetValue<bool>("Changes"))
    builder.Services.AddScoped<IChangeService, ChangeService>();

// Feature: KnowledgeBase
if (features.GetValue<bool>("KnowledgeBase"))
    builder.Services.AddScoped<IKnowledgeService, KnowledgeService>();

// Feature: Notifications
if (features.GetValue<bool>("Notifications"))
    builder.Services.AddScoped<INotificationService, NotificationService>();

// Feature: SLA (includes background evaluator)
if (features.GetValue<bool>("Sla"))
{
    builder.Services.AddScoped<ISlaService, SlaService>();
    builder.Services.AddHostedService<SlaBackgroundService>();
}

if (builder.Environment.IsDevelopment())
    builder.Services.AddHostedService<ViteDevServerService>();

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "Aperture ITSM API", Version = "v1" }));

var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

startupLog.Info("ApertureITSM API ready");
app.Run();
