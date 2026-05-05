namespace ApertureITSM.Core.Interfaces;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    int UserId { get; }
    string RoleCode { get; }
    bool IsAdmin { get; }
    bool IsManager { get; }
    int[] ServiceIds { get; }
}
