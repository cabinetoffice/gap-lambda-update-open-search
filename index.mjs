import contentful from 'contentful-management';
import fetch from 'node-fetch';

const openSearchConfig = {
  username: process.env.OPEN_SEARCH_USERNAME,
  password: process.env.OPEN_SEARCH_PASSWORD,
  url: process.env.OPEN_SEARCH_URL,
  domain: process.env.OPEN_SEARCH_DOMAIN,
};

const contentfulConfig = {
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  spaceId: process.env.CONTENTFUL_SPACE_ID,
  environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
};

const client = contentful.createClient(
  {
    accessToken: contentfulConfig.accessToken,
  },
  {
    type: 'plain',
    defaults: {
      spaceId: contentfulConfig.spaceId,
      environmentId: contentfulConfig.environmentId,
    },
  }
);

const getGrantById = async (contentfulEntryId) => {
  const grant = await client.entry.get({ entryId: contentfulEntryId });

  if (!grant) {
    throw new Error(
      `No published grant found in contentful with id ${contentfulEntryId}`
    );
  }
  return grant;
};

const updateElasticIndex = async (contentfulEntry, action) => {
  const auth = openSearchConfig.username + ':' + openSearchConfig.password;
  const authHeader = 'Basic ' + btoa(auth);
  const url = `${openSearchConfig.url}/${openSearchConfig.domain}/_doc/${contentfulEntry.sys.id}`;

  const ACTIONS = {
    ADD: 'PUT',
    REMOVE: 'DELETE',
  };

  const method = ACTIONS[action];
  if (!method)
    throw new Error(`Action not recognised for action type ${action}`);

  const body = JSON.stringify(contentfulEntry);

  console.log(
    `Updating elastic index for grant: '${contentfulEntry.fields.grantName['en-US']}', with contentful entry: \n ${body}`
  );
  const response = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: authHeader,
    },
    body: body,
  });

  if (!response || !response.ok) {
    const errorMessage = await response.text();
    throw new Error(
      `Failed to create/delete an elastic index entry for ad: '${contentfulEntry.sys.id}' in open search: ${errorMessage}`
    );
  } else {
    console.log(
      `${action} successful for elastic index for grant: '${contentfulEntry.fields.grantName['en-US']}'`
    );
  }
};

export const handler = async (data) => {
  console.log('SQS Message: ', data);
  for (const record of data.Records) {
    const message = JSON.parse(record?.body);
    if (!message.contentfulEntryId || !message.type) {
      console.log(`Invalid Message: ${message}`);
      throw new Error(`Invalid Message: ${record.body}`);
    }

    console.log(`contentful entry ID: ${message.contentfulEntryId}`);
    console.log(`type: ${message.type}`);

    const grant = await getGrantById(message.contentfulEntryId);
    await updateElasticIndex(grant, message.type);

    return { statusCode: 200 };
  }
};
