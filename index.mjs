import contentful from "contentful-management";
import fetch from "node-fetch";

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
    type: "plain",
    defaults: {
      spaceId: contentfulConfig.spaceId,
      environmentId: contentfulConfig.environmentId,
    },
  }
);

const getGrantById = async (contentfulEntryId) => {
  const { items } = await client.entry.getPublished({
    query: {
      "sys.id": contentfulEntryId,
      content_type: "grantDetails",
    },
  });

  if (!items || !items.length) {
    throw new Error(
      `No published grant found in contentful with id ${contentfulEntryId}`
    );
  }

  // Should always return one result as the id is unique
  console.log(`Found ${items.length} published grant(s) in contentful`);
  return items[0];
};

const updateElasticIndex = async (contentfulEntry, action) => {
  const auth = openSearchConfig.username + ":" + openSearchConfig.password;
  const authHeader = "Basic " + btoa(auth);
  const url = `${openSearchConfig.url}${openSearchConfig.domain}/_doc/${contentfulEntry.sys.id}`;

  const ACTIONS = {
    ADD: "PUT",
    REMOVE: "DELETE",
  };

  const method = ACTIONS[action];
  if (!method)
    throw new Error(`Action not recognised for action type ${action}`);

  const body = JSON.stringify(contentfulEntry);

  console.log(
    `Updating elastic index for grant ${contentfulEntry.fields.grantName["en-US"]}, with contentful entry: \n ${body}`
  );
  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: authHeader,
    },
    body: body,
  });

  if (!response || !response.ok) {
    const errorMessage = await response.text();
    throw new Error(
      `Failed to create an elastic index entry for ad ${contentfulEntry.sys.id} in open search: ${errorMessage}`
    );
  } else {
    console.log(
      `Successfully updated elastic index for grant ${contentfulEntry.fields.grantName["en-US"]}`
    );
  }
};

export const handler = async (message) => {
  const contentfulEntryId = message.contentfulEntryId;
  const grant = await getGrantById(contentfulEntryId);
  await updateElasticIndex(grant, message.type);

  return { statusCode: 200 };
};
