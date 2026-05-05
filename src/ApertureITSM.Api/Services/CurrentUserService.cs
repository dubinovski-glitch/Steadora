using ApertureITSM.Core.Interfaces;
using System.Security.Claims;

namespace ApertureITSM.Api.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public int UserId =>
        int.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public string RoleCode => User?.FindFirstValue("roleCode") ?? string.Empty;

    public bool IsAdmin => RoleCode == "admin";

    public bool IsManager => RoleCode == "manager";

    public int[] ServiceIds =>
        User?.FindAll("serviceId")
            .Select(c => int.TryParse(c.Value, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToArray() ?? [];
}
