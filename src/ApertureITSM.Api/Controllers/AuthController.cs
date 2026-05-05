using ApertureITSM.Core.Interfaces;
using ApertureITSM.Infrastructure;
using log4net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthRepository authRepo, IConfiguration config) : ControllerBase
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AuthController));

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var credentials = await authRepo.GetCredentialsAsync(req.Username);
        if (credentials is null || !PasswordHelper.Verify(req.Password, credentials.Value.PasswordHash))
        {
            log.Warn($"Failed login attempt for username: {req.Username}");
            return Unauthorized(new { error = "Invalid username or password" });
        }

        var user = await authRepo.GetUserByIdAsync(credentials.Value.UserId);
        if (user is null) return Unauthorized(new { error = "User account is inactive" });

        var token = GenerateToken(user, config);
        log.Info($"Login successful: {user.Username} (role: {user.RoleCode})");
        return Ok(new { token, user });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me([FromServices] ICurrentUserService currentUser)
    {
        var user = await authRepo.GetUserByIdAsync(currentUser.UserId);
        return user is null ? NotFound() : Ok(user);
    }

    private static string GenerateToken(Core.Models.AuthUser user, IConfiguration config)
    {
        var jwtSection = config.GetSection("Jwt");
        var secret = jwtSection["Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiryMinutes = jwtSection.GetValue<int>("ExpiryMinutes", 480);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new("username", user.Username),
            new(ClaimTypes.Email, user.Email),
            new("displayName", user.DisplayName),
            new("roleCode", user.RoleCode),
        };
        foreach (var serviceId in user.ServiceIds)
            claims.Add(new Claim("serviceId", serviceId.ToString()));

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record LoginRequest(string Username, string Password);
