import fetch from "node-fetch";
import cheerio from "cheerio";

export function convertToQueryString(obj) {
  const queryParams = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = encodeURIComponent(obj[key]);
      const param = `${encodeURIComponent(key)}=${value}`;
      queryParams.push(param);
    }
  }

  return queryParams.join("&");
}

//////////////////////////
// Get the number of documents found, the number of sources found and the number of words found
// from HTML content
//////////////////////////
export const getRechPlMetaInfo = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const tbodyElement = $("body table tbody");

  if (tbodyElement.length > 0) {
    const docsFoundElement = $("body table tbody tr th");
    const SourceFoundElement = $(
      "body table tbody tr:nth-child(5) th:nth-child(3)"
    );
    const WordsFoundElement = $(
      "body table tbody tr:nth-child(7) th:nth-child(3) "
    );
    const pattern = /\d+\n$/;
    let nrDocsFound = docsFoundElement.html().match(pattern)?.[0];
    nrDocsFound = nrDocsFound?.replace(/\n/g, "").replace(/\s/g, "");
    let nrSourcesFound = SourceFoundElement.text();
    nrSourcesFound = nrSourcesFound?.replace(/\n/g, "").replace(/\s/g, "");
    let nrWordsFound = WordsFoundElement.text();
    nrWordsFound = nrWordsFound?.replace(/\n/g, "").replace(/\s/g, "");
    if (nrDocsFound && nrSourcesFound && nrWordsFound) {
      return {
        nrDocsFound,
        nrSourcesFound,
        nrWordsFound,
      };
    } else {
      throw new Error("Unexpected HTML content");
    }
  } else {
    throw new Error("Input element not found.");
  }
};

const performGetRequest = async (url) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    if (response.ok) {
      // return response as text
      const data = await response.text();
      return data;
    } else {
      throw new Error("Request failed");
    }
  } catch (error) {
    throw new Error(
      `An error occurred while performing the get request: ${error.message}`
    );
  }
};

//////////////////////////
// get the option list elements from the search form page rech_n2.htm
//////////////////////////
export const getSelectElements = async (language) => {
  const validLanguages = ["n", "f", "d"];
  if (!validLanguages.includes(language)) {
    throw new Error(
      `Invalid language. Must be one of ${JSON.stringify(validLanguages)}`
    );
  }

  const url = `https://www.ejustice.just.fgov.be/doc/rech_${language}2.htm`;

  try {
    const html = await performGetRequest(url);

    const $ = cheerio.load(html);
    const optionLists = $("select");
    return optionLists.toArray().reduce((options, element) => {
      const optionList = $(element);
      const optionListName = optionList.attr("name");
      // Get all the child option elements of each select.
      const optionListValues = optionList
        .children()
        .toArray()
        .map((option) => $(option).attr("value").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (optionListName && optionListValues.length > 0) {
        options[optionListName] = optionListValues;
      }
      return options;
    }, {});
  } catch (error) {
    console.error(error);
  }
};

export const performQueryNumbersRequest = async (query) => {
  const url =
    "https://www.ejustice.just.fgov.be/finder_search/resultats_fr.html";
  const headers = {
    accept: "text/html",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    "upgrade-insecure-requests": "1",
    Referer: "https://www.ejustice.just.fgov.be/finder_search/index_fr.html",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  const body = new URLSearchParams(Object.entries(query)).toString();
  try {
    const response = await fetch(url, { method: "POST", headers, body });
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      return Number.parseInt($("#nb_res").text().trim(), 10);
    } else {
      throw new Error("Request failed");
    }
  } catch (error) {
    throw new Error(
      `An error occurred while performing the query numbers request: ${error.message}`
    );
  }
};

const performPostRequest = async (url, headers, body) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });
    if (response.ok) {
      // return response as text
      const data = await response.text();
      return data;
    } else {
      throw new Error("Request failed");
    }
  } catch (error) {
    throw new Error(
      `An error occurred while performing the post request: ${error.message}`
    );
  }
};

const composeRechRequestBody = (query) => {
  const params = new URLSearchParams(Object.entries(query));
  return params.toString();
};

export const makeRechPlPostRequest = async (searchQuery) => {
  const url = "https://www.ejustice.just.fgov.be/cgi/rech.pl";
  const headers = {
    accept: "text/html",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    "upgrade-insecure-requests": "1",
    Referer: "https://www.ejustice.just.fgov.be/cgi/rech.pl",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  const body = composeRechRequestBody(searchQuery); // Use the result of the function here
  try {
    const response = await performPostRequest(url, headers, body);
    return response;
  } catch (error) {
    throw new Error(
      `An error occurred in makeRechtPlPostRequest: ${error.message}`
    );
  }
};

///////////////////////////////////////////////////////////
// List Caller functions per 100 starting from rowId
///////////////////////////////////////////////////////////

export async function makeListCallerPostRequest(rowId, sQuery) {
  const body = composeListCallerBody(rowId, sQuery);
  const result = await performListCallerPostRequest(body);
  return result;
  // return { rowId, result };
}

function composeListCallerBody(rowId, sQuery) {
  const body = new URLSearchParams({ row_id: rowId, ...sQuery });
  return body.toString();
}

async function performListCallerPostRequest(body) {
  const url = "https://www.ejustice.just.fgov.be/cgi/list_body.pl";
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: body,
  });

  return response;
}

export function get100Records(sQuery) {
  return function (startId) {
    return makeListCallerPostRequest(startId, sQuery);
  };
}

///////////////////////////////////////////////////////////
// get repeating elements from list_body.pl
///////////////////////////////////////////////////////////

export function parseRepeatingElements(html) {
  const $ = cheerio.load(html);

  const results = [];
  const listItems = $("ol li").get();

  // prev_row_id, next_row_id, not used for now
  const firstFormAfterBody = $("html > body form[name='allrows']:first-child");
  const firstFormInputs = firstFormAfterBody.find("input[type='hidden']").get();
  const firstFormInputValues = {};
  firstFormInputs.forEach((input) => {
    const name = $(input).attr("name");
    const value = $(input).attr("value");
    firstFormInputValues[name] = value;
  });
  // firstFormInputValues["prev_row_id"],
  // firstFormInputValues["next_row_id"],

  listItems.forEach((li) => {
    const link = $(li).find("a").attr("href");
    const text = $(li).find("a").text().trim();

    const table = $(li).find("table");
    const form = $(li).find("table tr td:nth-child(2) form");
    const formAction = $(form).attr("action");

    const inputs = $(form).find("input").get();
    const formInputValues = {};
    inputs.forEach((input) => {
      const name = $(input).attr("name");
      const value = $(input).attr("value");
      formInputValues[name] = value;
    });

    const {
      numac,
      caller,
      article_lang,
      row_id,
      numero,
      pub_date,
      language,
      du,
      fr,
      choix1,
      choix2,
      fromtab,
      nl,
      trier,
      bron,
      text1,
      sql,
      rech,
      tri,
    } = formInputValues;

    const fontElements = $(li).find("table tr:first-child td:first-child font");
    const pub = fontElements
      .map((index, element) => $(element).text().trim())
      .get();

    results.push({
      pub,
      text,
      link,
      formInputValues,
    });
  });
  return results;
}

// prepareListBodyPlRequest is a lazy loading function that fetches records in batches of 100
// until the requested number of records is reached or there are no more records to fetch
export function prepareListBodyPlRequest(sQuery) {
  let startId = 1;
  let records = [];
  return {
    async next(numRecords) {
      while (records.length < numRecords) {
        const result = await get100Records(sQuery)(startId);
        const content = await result.text();
        const newRecords = parseRepeatingElements(content);

        // Add the fetched records to the buffer
        records = records.concat(newRecords);

        // If server returns less than 100 records, there are no more records to fetch
        if (newRecords.length < 100) {
          console.info(
            `++++ Fetched the last batch of ${newRecords.length} records, starting from ID ${startId}`
          );
          // log the total number of records fetched
          console.info(
            `===> TOTAL fetched records is ${startId + newRecords.length - 1}`
          );
          break;
        } else {
          console.info(
            `---- Fetched a new batch of ${newRecords.length} records, starting from ID ${startId}`
          );
          startId += 100;
        }
      }

      // Extract 'numRecords' records or all available records if less than 'numRecords', and remove them from the buffer
      const output = records.slice(0, Math.min(numRecords, records.length));
      records = records.slice(Math.min(numRecords, records.length));

      // Log remaining items in the buffer
      console.info(`${records.length} items left in the buffer`);

      return output;
    },
  };
}

export const makeArticlePlPostRequest = async (parameters) => {
  // this function :
  // 1. makes a post request to https://www.ejustice.just.fgov.be/cgi/article.pl
  // 2. extract the frame URLs from the responsePost, these are the URLs to the article body and foot
  // 3. a get request to the frame URLs to get the article body and foot
  // 4. alternative to get the article body and foot directly with the parameters we know in advance
  // 5. return the article body and foot
  //

  const postArtUrl = "https://www.ejustice.just.fgov.be/cgi/article.pl";
  const getFootUrl = "https://www.ejustice.just.fgov.be/cgi/article_foot.pl";
  const getBodyUrl = "https://www.ejustice.just.fgov.be/cgi/article_body.pl";

  const postHeaders = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language":
      "nl-BE,nl;q=0.9,en-BE;q=0.8,en;q=0.7,nl-NL;q=0.6,en-US;q=0.5",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    pragma: "no-cache",
    "sec-ch-ua":
      '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "frame",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  const body = composeRechRequestBody(parameters);

  try {
    console.log(
      `starting article.pl POST request to get article_body and article_header for ${parameters.numac}`
    );
    const responsePost = await performPostRequest(
      postArtUrl,
      postHeaders,
      body
    );
    // responsePost looks like this:
    // <HTML VERSION=".//IETF//DTD HTML 3.0//EN">
    // ...
    // <frame  src=article_body.pl?numac=2023042064&caller=list&article_lang=N&row_id=1&numero=1&pub_date=2023-05-30&language=nl&du=d&fr=f&choix1=EN&choix2=EN&fromtab=+moftxt+UNION+montxt+UNION+modtxt&nl=n&trier=afkondiging&bron=GRONDWETTELIJK+HOF&text1=lavrysen&sql=bron+%3D%27GRONDWETTELIJK+HOF%27+and+%28+%28+htit+contains++%28+%27lavrysen%27%29++++++%29+or+%28+text+contains++%28+%27lavrysen%27%29++++++%29+%29&rech=2144&tri=dd+AS+RANK+  name=Body scrolling=AUTO marginheight=0>
    // <frame  src=article_foot.pl?numac=2023042064&caller=list&article_lang=N&row_id=1&numero=1&pub_date=2023-05-30&language=nl&du=d&fr=f&choix1=EN&choix2=EN&fromtab=+moftxt+UNION+montxt+UNION+modtxt&nl=n&trier=afkondiging&bron=GRONDWETTELIJK+HOF&text1=lavrysen&sql=bron+%3D%27GRONDWETTELIJK+HOF%27+and+%28+%28+htit+contains++%28+%27lavrysen%27%29++++++%29+or+%28+text+contains++%28+%27lavrysen%27%29++++++%29+%29&rech=2144&tri=dd+AS+RANK+  name=Foot scrolling=NO  resize marginheight=0 >
    // ...
    // </FRAMESET></HTML>

    //
    // 1st method, we extract the frame URLs from the responsePost
    //
    const frame1_src_value = responsePost.match(
      /<frame  src=(.*)  name=Body scrolling=AUTO marginheight=0>/
    )[1];
    const frame2_src_value = responsePost.match(
      /<frame  src=(.*)  name=Foot scrolling=NO  resize marginheight=0 >/
    )[1];
    if (!frame1_src_value || !frame2_src_value) {
      throw new Error("Could not extract frame URLs");
    }
    const bodyUrlFromPostResponse = `https://www.ejustice.just.fgov.be/cgi/${frame1_src_value}`;
    const footUrlFromPostResponse = `https://www.ejustice.just.fgov.be/cgi/${frame2_src_value}`;

    const [bodyResponse, footResponse] = await Promise.all([
      performGetRequest(bodyUrlFromPostResponse),
      performGetRequest(footUrlFromPostResponse),
    ]);
    // todo: find link to pdf in <INPUT type=hidden name=urlpdf value=\"/mopdf/2023/05/25_1.pdf#Page24  \">
    const pdfUrl = bodyResponse.match(
      /<INPUT type=hidden name=urlpdf value=\"(.*)\">/
    )[1];

    // end of 1st method

    //
    // 2nd method, we call the get requests directly with the parameters we know in advance
    //

    // const [footResponse, bodyResponse] = await Promise.all([
    //   performGetRequest(`${getFootUrl}?${convertToQueryString(parameters)}`),
    //   performGetRequest(`${getFootUrl}?${convertToQueryString(parameters)}`),
    // ]);
    // end of 2nd method
    console.log(`Done with article.pl POST request for ${parameters.numac}`);
    return {
      pdfUrl,
    };
  } catch (error) {
    throw new Error(
      `An error occurred while making the request: ${error.message}`
    );
  }
};
