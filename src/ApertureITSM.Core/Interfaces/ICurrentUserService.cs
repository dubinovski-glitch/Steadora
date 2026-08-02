namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Exposes identity and authorization details for the user making the current request.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>Gets whether the current request is from an authenticated user.</summary>
    bool IsAuthenticated { get; }
    /// <summary>Gets the identifier of the current user.</summary>
    int UserId { get; }
    /// <summary>Gets the role code assigned to the current user.</summary>
    string RoleCode { get; }
    /// <summary>Gets whether the current user has the administrator role.</summary>
    bool IsAdmin { get; }
    /// <summary>Gets whether the current user has the manager role.</summary>
    bool IsManager { get; }
    /// <summary>Gets the identifiers of the services the current user is associated with.</summary>
    int[] ServiceIds { get; }
}
