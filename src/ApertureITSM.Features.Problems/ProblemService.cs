using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;

namespace ApertureITSM.Features.Problems;

public interface IProblemService
{
    Task<IEnumerable<Problem>> GetAllAsync(bool includeResolved, int[]? groupIds = null);
    Task<Problem?> GetDetailAsync(long problemId);
    Task<long> CreateAsync(CreateProblemRequest request);
    Task UpdateAsync(long problemId, UpdateProblemRequest request);
    Task SetStateAsync(long problemId, string stateCode, int? actorUserId);
    Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId);
}

public class ProblemService(IProblemRepository repository) : IProblemService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ProblemService));

    public Task<IEnumerable<Problem>> GetAllAsync(bool includeResolved, int[]? groupIds = null)
        => repository.GetAllAsync(includeResolved, groupIds);

    public Task<Problem?> GetDetailAsync(long problemId)
        => repository.GetByIdAsync(problemId);

    public Task<long> CreateAsync(CreateProblemRequest request)
    {
        log.Info($"Creating problem: {request.Title}");
        return repository.CreateAsync(request);
    }

    public Task UpdateAsync(long problemId, UpdateProblemRequest request)
    {
        log.Info($"Updating problem {problemId}: {request.Title}");
        return repository.UpdateAsync(problemId, request);
    }

    public Task SetStateAsync(long problemId, string stateCode, int? actorUserId)
        => repository.UpdateStateAsync(problemId, stateCode, actorUserId);

    public Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId)
        => repository.UpdateFieldAsync(problemId, field, value, actorUserId);
}
