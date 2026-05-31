using ApertureITSM.Api;
using ApertureITSM.Api.Hubs;
using ApertureITSM.Api.Services;
using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Changes;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.KnowledgeBase;
using ApertureITSM.Features.Notifications;
using ApertureITSM.Features.Sla;
using ApertureITSM.Features.Problems;
using ApertureITSM.Infrastructure.Database;
using ApertureITSM.Infrastructure.Repositories;
using log4net;
using log4net.Config;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Reflection;
using System.Text;

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

// JWT authentication
var jwtSection = config.GetSection("Jwt");
var jwtSecret = jwtSection["Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        // Support JWT via query string for SignalR WebSocket connections
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

// Infrastructure
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IDbConnectionFactory>(_ => new SqlConnectionFactory(connStr));
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IIncidentRepository, IncidentRepository>();
builder.Services.AddScoped<IProblemRepository, ProblemRepository>();
builder.Services.AddScoped<IChangeRepository, ChangeRepository>();
builder.Services.AddScoped<IKbRepository, KbRepository>();
builder.Services.AddScoped<IActivityRepository, ActivityRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ILookupRepository, LookupRepository>();
builder.Services.AddScoped<ISlaRepository, SlaRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<ISearchRepository, SearchRepository>();
builder.Services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();

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

// Require authentication on all controllers by default; individual actions may use [AllowAnonymous]
builder.Services.AddControllers(options =>
    options.Filters.Add(new AuthorizeFilter()));

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

startupLog.Info("ApertureITSM API ready");
app.Run();
