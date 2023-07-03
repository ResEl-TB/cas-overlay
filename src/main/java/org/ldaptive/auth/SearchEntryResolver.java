package org.ldaptive.auth;

import org.ldaptive.*;

import java.util.Arrays;

public class SearchEntryResolver extends AbstractSearchEntryResolver implements ConnectionFactoryManager
{

    public SearchEntryResolver() {}

    public SearchEntryResolver(final ConnectionFactory cf)
    {
        setConnectionFactory(cf);
    }

    @Override
    public SearchResponse performLdapSearch(
            final AuthenticationCriteria criteria,
            final AuthenticationHandlerResponse response)
            throws LdapException
    {
        final Connection conn = response.getConnection();
        if (conn != null) {
            return conn.operation(createSearchRequest(criteria)).execute();
        } else {
            final SearchOperation op = createSearchOperation();
            return op.execute(createSearchRequest(criteria));
        }
    }

    @Override
    public String toString()
    {
        return new StringBuilder("[").append(
                        getClass().getName()).append("@").append(hashCode()).append("::")
                .append("factory=").append(getConnectionFactory()).append(", ")
                .append("baseDn=").append(getBaseDn()).append(", ")
                .append("userFilter=").append(getUserFilter()).append(", ")
                .append("userFilterParameters=").append(Arrays.toString(getUserFilterParameters())).append(", ")
                .append("allowMultipleEntries=").append(getAllowMultipleEntries()).append(", ")
                .append("subtreeSearch=").append(getSubtreeSearch()).append(", ")
                .append("derefAliases=").append(getDerefAliases()).append(", ")
                .append("binaryAttributes=").append(Arrays.toString(getBinaryAttributes())).append(", ")
                .append("entryHandlers=").append(Arrays.toString(getEntryHandlers())).append("]").toString();
    }
}
