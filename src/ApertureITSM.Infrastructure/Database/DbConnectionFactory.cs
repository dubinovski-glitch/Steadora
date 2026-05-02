using Microsoft.Data.SqlClient;
using System.Data;

namespace ApertureITSM.Infrastructure.Database;

public interface IDbConnectionFactory
{
    IDbConnection Create();
}

public class SqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public IDbConnection Create() => new SqlConnection(connectionString);
}
