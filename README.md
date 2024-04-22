# gap-lambda-update-open-search

This lambda is invoked by gap-find-admin-api when publishing or un-publishing adverts on contentful.

The purpose of this lambda is to:

- fetch publish grants via contentful-management by contentful entry id given in the request
- update elastic search via http using the contentful entry result

## Invocation

The request requires the follwoing message payload:

{
type: 'ADD' || 'REMOVE'
contentfulEntryId: string
}
