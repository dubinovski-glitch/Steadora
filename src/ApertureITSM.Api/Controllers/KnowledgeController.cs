using ApertureITSM.Features.KnowledgeBase;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/knowledge")]
public class KnowledgeController(IKnowledgeService service) : ControllerBase
{
    [HttpGet("articles")]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] int? categoryId)
    {
        var articles = await service.SearchAsync(q, categoryId);
        return Ok(articles);
    }

    [HttpGet("articles/{id:long}")]
    public async Task<IActionResult> GetArticle(long id)
    {
        var article = await service.GetArticleAsync(id);
        return article is null ? NotFound() : Ok(article);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await service.GetCategoriesAsync();
        return Ok(cats);
    }

    [HttpPost("articles/{id:long}/vote")]
    public async Task<IActionResult> Vote(long id, [FromBody] KbVoteRequest request)
    {
        await service.VoteAsync(id, request.Helpful);
        return NoContent();
    }
}

public record KbVoteRequest(bool Helpful);
