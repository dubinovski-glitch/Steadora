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

/// <summary>
/// Handles authentication: validating credentials, issuing JWT bearer tokens, and exposing the
/// currently authenticated user's profile.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthRepository authRepo, IConfiguration config) : ControllerBase
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AuthController));

    /// <summary>
    /// POST api/auth/login — anonymous. Verifies the username/password and returns a signed JWT
    /// plus the user record, or 401 if the credentials are invalid or the account is inactive.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        // Look up the stored hash and verify the supplied password against it
        var credentials = await authRepo.GetCredentialsAsync(req.Username);
        if (credentials is null || !PasswordHelper.Verify(req.Password, credentials.Value.PasswordHash))
        {
            log.Warn($"Failed login attempt for username: {req.Username}");
            return Unauthorized(new { error = "Invalid username or password" });
        }

        // Re-fetch the full user; a null result here means the account is no longer active
        var user = await authRepo.GetUserByIdAsync(credentials.Value.UserId);
        if (user is null) return Unauthorized(new { error = "User account is inactive" });

        var token = GenerateToken(user, config);
        log.Info($"Login successful: {user.Username} (role: {user.RoleCode})");
        return Ok(new { token, user });
    }

    /// <summary>
    /// GET api/auth/me — returns the profile of the caller resolved from the JWT, or 404 if the
    /// underlying user record no longer exists.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me([FromServices] ICurrentUserService currentUser)
    {
        var user = await authRepo.GetUserByIdAsync(currentUser.UserId);
        return user is null ? NotFound() : Ok(user);
    }

    /// <summary>
    /// Builds and signs a JWT for the given user, embedding identity, role and assigned service
    /// claims so downstream requests can be authorized and scoped without a database lookup.
    /// </summary>
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
        // One claim per assigned service so the API can scope data to the user's services
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

/// <summary>Login payload carrying the username and plaintext password to verify.</summary>
public record LoginRequest(string Username, string Password);
