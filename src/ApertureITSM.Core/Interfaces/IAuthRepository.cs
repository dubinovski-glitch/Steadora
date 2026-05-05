using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IAuthRepository
{
    Task<(int UserId, string PasswordHash)?> GetCredentialsAsync(string username);
    Task<AuthUser?> GetUserByIdAsync(int userId);
}
